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


class InstantPurchaseRequestSchema(BaseModel):
    trip_id: Optional[uuid.UUID] = None
    payment_method: str = "Portefeuille CROUS"
    phone_number: Optional[str] = None
    amount: float = 100.00


@router.post("/instant-purchase", response_model=ActiveTicketScreenOutSchema, status_code=status.HTTP_201_CREATED)
@router.post("/{trip_id}/instant-purchase", response_model=ActiveTicketScreenOutSchema, status_code=status.HTTP_201_CREATED)
async def instant_ticket_purchase(
    payload: InstantPurchaseRequestSchema,
    trip_id: Optional[uuid.UUID] = None,
    current_user: Users = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Achat immédiat et émission dynamique d'un billet numérique (Portefeuille CROUS ou Mobile Money).
    Enregistre la transaction et le ticket directement dans PostgreSQL.
    """
    from datetime import datetime, timedelta, timezone
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from app.models.trip_model import Trips, TripStatusEnum
    from app.models.fleet_model import Routes, Buses
    from app.models.ticket_model import Tickets, TicketStatusEnum
    from app.models.payment_model import Payments, PaymentStatusEnum, PaymentGatewayEnum
    from app.services.ticket_engine_service import generate_secure_sms_otp, generate_encrypted_qr_payload

    target_trip_id = trip_id or payload.trip_id

    # 1. Recherche du trajet ciblé ou du premier trajet disponible
    trip = None
    if target_trip_id:
        trip_query = await db.execute(
            select(Trips)
            .options(
                selectinload(Trips.route),
                selectinload(Trips.bus)
            )
            .where(Trips.trip_id == target_trip_id)
            .with_for_update()
        )
        trip = trip_query.scalars().first()

    if not trip:
        trip_query = await db.execute(
            select(Trips)
            .options(
                selectinload(Trips.route),
                selectinload(Trips.bus)
            )
            .where(Trips.status.in_([TripStatusEnum.SCHEDULED, TripStatusEnum.BOARDING]))
            .order_by(Trips.departure_time.asc())
            .with_for_update()
        )
        trip = trip_query.scalars().first()

    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucun trajet de bus actif n'est disponible pour la réservation."
        )

    if trip.available_seats <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ce bus est complet (0 place disponible)."
        )

    # 2. Décrémentation de la place disponible
    trip.available_seats = max(0, trip.available_seats - 1)

    # 3. Création du paiement réussi
    clean_phone = (payload.phone_number or current_user.phone_number).replace(" ", "")
    txn_ref = f"CROUS-PAY-{uuid.uuid4().hex[:8].upper()}"
    payment = Payments(
        user_id=current_user.user_id,
        transaction_reference=txn_ref,
        gateway=PaymentGatewayEnum.FEDAPAY,
        gateway_reference=f"WALLET-{payload.payment_method}",
        amount=payload.amount,
        phone_number=clean_phone,
        status=PaymentStatusEnum.SUCCESSFUL
    )
    db.add(payment)
    await db.flush()

    # 4. Émission du billet avec code SMS et QR sécurisé
    ticket_id = uuid.uuid4()
    qr_token = generate_encrypted_qr_payload(str(ticket_id), str(current_user.user_id), str(trip.trip_id))
    sms_otp = generate_secure_sms_otp(8)

    now = datetime.now(timezone.utc)
    initial_exp = trip.departure_time or (now + timedelta(hours=4))
    final_exp = initial_exp + timedelta(days=7)

    ticket = Tickets(
        ticket_id=ticket_id,
        user_id=current_user.user_id,
        trip_id=trip.trip_id,
        payment_id=payment.payment_id,
        qr_code_token=qr_token,
        sms_backup_code=sms_otp,
        status=TicketStatusEnum.ISSUED,
        recycle_count=0,
        initial_expiration_date=initial_exp,
        final_expiration_date=final_exp
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)

    # Formatage du code SMS (e.g. A7B9-X2M4)
    if len(sms_otp) == 8:
        formatted_code = f"{sms_otp[:4]}-{sms_otp[4:]}"
    else:
        formatted_code = sms_otp

    route_name = trip.route.route_name if trip.route else "Campus Express • Ligne A"
    bus_label = trip.bus.bus_code if trip.bus else "Bus CROUS #402"

    return ActiveTicketScreenOutSchema(
        ticket_id=ticket.ticket_id,
        trip_id=trip.trip_id,
        route_name=route_name,
        student_name=f"{current_user.first_name} {current_user.last_name}",
        student_id=f"Student ID: {current_user.matricule_uac or '2023-4458'}",
        matricule_uac=current_user.matricule_uac,
        qr_code_token=ticket.qr_code_token,
        code=formatted_code,
        status="Valid Ticket",
        raw_status=ticket.status,
        available_for_days=7,
        avail_for_label="Available for 7 more days",
        has_delay=trip.delay_minutes > 0,
        delay_minutes=trip.delay_minutes,
        delay_title=f"Delay: +{trip.delay_minutes} min" if trip.delay_minutes > 0 else None,
        delay_reason=trip.delay_reason,
        bus_code=bus_label,
        capacity_percentage=int(((trip.total_seats - trip.available_seats) / trip.total_seats) * 100),
        eta_minutes=8,
        eta_label="8 min",
        latitude=6.4474,
        longitude=2.3557,
        speed_kmh=38.0
    )

