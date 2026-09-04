import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_db
from app.models.user_model import Users
from app.schemas.payment_schema import PaymentInitiateRequestSchema, PaymentInitiateResponseSchema
from app.services.auth_service import get_current_authenticated_user
from app.services.ticket_engine_service import book_trip_with_capacity_lock
from app.services.payment_service import payment_service
from app.models.payment_model import PaymentGatewayEnum

router = APIRouter(prefix="/trips", tags=["Booking & Payments"])


@router.post("/{trip_id}/book", response_model=PaymentInitiateResponseSchema, status_code=status.HTTP_200_OK)
async def initiate_ticket_booking(
    trip_id: uuid.UUID,
    payload: PaymentInitiateRequestSchema,
    current_user: Users = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Initiate seat booking on a trip with strict row-level locking (FOR UPDATE)
    to prevent concurrency race conditions and overbooking.
    Supports local mobile money methods ('mtn' or 'moov') and direct gateways.
    """
    # Normalize payment gateway / method
    gateway = payload.gateway or PaymentGatewayEnum.FEDAPAY
    payment_method = payload.payment_method or "mtn"
    phone = payload.phone_number or current_user.phone_number

    payment, trip = await book_trip_with_capacity_lock(
        user=current_user,
        trip_id=trip_id,
        gateway=gateway,
        phone_number=phone,
        db=db
    )

    # Initialize payment flow with gateway
    if gateway == PaymentGatewayEnum.FEDAPAY:
        gateway_data = await payment_service.initialize_fedapay_transaction(
            amount=float(payment.amount),
            description=f"Ticket UAC-BusPass ({payment_method.upper()}) - Trajet {trip.trip_id}",
            customer_phone=payment.phone_number,
            customer_firstname=current_user.first_name,
            customer_lastname=current_user.last_name,
            custom_metadata={
                "payment_id": str(payment.payment_id),
                "trip_id": str(trip.trip_id),
                "payment_method": payment_method
            }
        )
    else:
        gateway_data = await payment_service.initialize_kkiapay_transaction(
            amount=float(payment.amount),
            customer_phone=payment.phone_number,
            customer_name=f"{current_user.first_name} {current_user.last_name}",
            custom_metadata={
                "payment_id": str(payment.payment_id),
                "trip_id": str(trip.trip_id),
                "payment_method": payment_method
            }
        )

    return PaymentInitiateResponseSchema(
        payment_id=payment.payment_id,
        transaction_reference=payment.transaction_reference,
        gateway=payment.gateway,
        payment_method=payment_method,
        amount=float(payment.amount),
        checkout_url=gateway_data.get("checkout_url"),
        status=payment.status,
        message="Réservation initialisée. Veuillez procéder au paiement Mobile Money."
    )
