import uuid
import logging
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_async_db
from app.models.payment_model import Payments, PaymentStatusEnum
from app.models.user_model import Users
from app.services.ticket_engine_service import confirm_payment_and_issue_ticket
from app.services.notification_service import notification_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["Payment Webhooks"])


@router.post("/fedapay", status_code=status.HTTP_200_OK)
async def fedapay_webhook_handler(
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Secure Webhook endpoint receiving transaction status events from FedaPay.
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    logger.info(f"Received FedaPay webhook: {body}")
    event_name = body.get("name") or body.get("event")
    entity = body.get("entity", {})
    custom_metadata = entity.get("custom_metadata", {})
    
    payment_id_str = custom_metadata.get("payment_id")
    trip_id_str = custom_metadata.get("trip_id")
    gateway_status = entity.get("status")

    if (event_name == "transaction.approved" or gateway_status == "approved") and payment_id_str and trip_id_str:
        payment_uuid = uuid.UUID(payment_id_str)
        trip_uuid = uuid.UUID(trip_id_str)
        
        ticket = await confirm_payment_and_issue_ticket(
            payment_id=payment_uuid,
            trip_id=trip_uuid,
            gateway_reference=str(entity.get("id")),
            db=db
        )
        
        # Send SMS backup notification to student
        user = await db.get(Users, ticket.user_id)
        if user:
            await notification_service.send_sms(
                phone_number=user.phone_number,
                message=f"UAC-BusPass : Votre ticket est confirmé ! Code de secours SMS : {ticket.sms_backup_code}. Présentez votre QR Code à l'embarquement."
            )

    return {"status": "success"}


@router.post("/kkiapay", status_code=status.HTTP_200_OK)
async def kkiapay_webhook_handler(
    request: Request,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Secure Webhook endpoint receiving transaction status events from KkiaPay.
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    logger.info(f"Received KkiaPay webhook: {body}")
    status_str = body.get("status")
    transaction_id = body.get("transactionId")
    data = body.get("data", {})
    custom_metadata = data.get("custom_metadata", {})
    
    payment_id_str = custom_metadata.get("payment_id")
    trip_id_str = custom_metadata.get("trip_id")

    if status_str == "SUCCESS" and payment_id_str and trip_id_str:
        payment_uuid = uuid.UUID(payment_id_str)
        trip_uuid = uuid.UUID(trip_id_str)

        ticket = await confirm_payment_and_issue_ticket(
            payment_id=payment_uuid,
            trip_id=trip_uuid,
            gateway_reference=str(transaction_id),
            db=db
        )

        user = await db.get(Users, ticket.user_id)
        if user:
            await notification_service.send_sms(
                phone_number=user.phone_number,
                message=f"UAC-BusPass : Paiement KkiaPay validé. Code SMS secours: {ticket.sms_backup_code}."
            )

    return {"status": "success"}
