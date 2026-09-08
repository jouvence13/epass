import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

logger = logging.getLogger(__name__)

from app.core.database import get_async_db
from app.models.user_model import Users
from app.models.payment_model import (
    Payments,
    PaymentGatewayEnum,
    PaymentStatusEnum,
    Wallets,
    UserPaymentMethods,
)
from app.schemas.payment_schema import (
    PaymentMethodOutSchema,
    RechargeHistoryOutSchema,
    WalletRechargeRequestSchema,
    AddPaymentMethodSchema,
    WalletOutSchema,
    WalletBalanceOutSchema,
)
from app.services.auth_service import get_current_authenticated_user
from app.services.payment_service import payment_service

router = APIRouter(prefix="/payments", tags=["Payments & Wallet"])


@router.get("/methods", response_model=List[PaymentMethodOutSchema])
async def get_payment_methods(
    current_user: Users = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Returns payment methods and live wallet balance strictly from PostgreSQL for current_user.
    If none exist yet, automatically initializes default Mobile Money accounts for the user's phone number.
    """
    # 1. Fetch user's registered operator payment methods from DB
    methods_query = await db.execute(
        select(UserPaymentMethods)
        .where(UserPaymentMethods.user_id == current_user.user_id)
        .order_by(UserPaymentMethods.created_at.asc())
    )
    user_methods = methods_query.scalars().all()

    # Si aucun moyen de paiement enregistré, initialiser automatiquement avec le numéro de l'utilisateur
    if not user_methods:
        phone = current_user.phone_number
        if not phone.startswith("+229"):
            phone = f"+229{phone.lstrip('+')}"
            
        default_methods = [
            UserPaymentMethods(
                user_id=current_user.user_id,
                provider_type="MTN_MOMO",
                account_number=phone,
                account_label="Compte MTN Mobile Money",
                is_default=True
            ),
            UserPaymentMethods(
                user_id=current_user.user_id,
                provider_type="MOOV_MONEY",
                account_number=phone,
                account_label="Compte Moov Money",
                is_default=False
            ),
            UserPaymentMethods(
                user_id=current_user.user_id,
                provider_type="CELTIIS_CASH",
                account_number=phone,
                account_label="Compte Celtiis Cash",
                is_default=False
            ),
        ]
        db.add_all(default_methods)
        await db.commit()
        for m in default_methods:
            await db.refresh(m)
        user_methods = default_methods

    # 2. Fetch user's wallet from DB
    wallet_query = await db.execute(
        select(Wallets).where(Wallets.user_id == current_user.user_id)
    )
    wallet = wallet_query.scalars().first()
    if not wallet:
        wallet = Wallets(
            user_id=current_user.user_id,
            balance=2300.0,
            currency="FCFA"
        )
        db.add(wallet)
        await db.commit()
        await db.refresh(wallet)

    # 3. Format dynamic response strictly from database records
    items: List[PaymentMethodOutSchema] = []
    for m in user_methods:
        if m.provider_type == "MTN_MOMO":
            items.append(
                PaymentMethodOutSchema(
                    id=str(m.method_id),
                    type="MTN_MOMO",
                    title=m.account_label,
                    account=m.account_number,
                    isDefault=m.is_default,
                    color="#fbbf24",
                    icon="phone-android",
                    code="*880#"
                )
            )
        elif m.provider_type == "MOOV_MONEY":
            items.append(
                PaymentMethodOutSchema(
                    id=str(m.method_id),
                    type="MOOV_MONEY",
                    title=m.account_label,
                    account=m.account_number,
                    isDefault=m.is_default,
                    color="#0284c7",
                    icon="contactless",
                    code="*855#"
                )
            )
        elif m.provider_type == "CELTIIS_CASH":
            items.append(
                PaymentMethodOutSchema(
                    id=str(m.method_id),
                    type="CELTIIS_CASH",
                    title=m.account_label,
                    account=m.account_number,
                    isDefault=m.is_default,
                    color="#0070ba",
                    icon="smartphone",
                    code="*888#"
                )
            )

    # Add dynamic Wallet from PostgreSQL
    if wallet:
        items.append(
            PaymentMethodOutSchema(
                id=str(wallet.wallet_id),
                type="CROUS_WALLET",
                title="Portefeuille Étudiant CROUS",
                account=f"Solde disponible : {int(wallet.balance):,} FCFA".replace(",", " "),
                isDefault=False,
                color="#1a56db",
                icon="account-balance-wallet",
                code="Subvention CROUS"
            )
        )

    return items


@router.post("/methods", response_model=PaymentMethodOutSchema)
async def add_payment_method(
    payload: AddPaymentMethodSchema,
    current_user: Users = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Adds a new payment method for the authenticated user in PostgreSQL.
    """
    if payload.is_default:
        await db.execute(
            update(UserPaymentMethods)
            .where(UserPaymentMethods.user_id == current_user.user_id)
            .values(is_default=False)
        )

    existing_query = await db.execute(
        select(UserPaymentMethods).where(
            UserPaymentMethods.user_id == current_user.user_id,
            UserPaymentMethods.provider_type == payload.provider_type
        )
    )
    new_pm = existing_query.scalars().first()
    if new_pm:
        new_pm.account_number = payload.account_number
        new_pm.account_label = payload.account_label
        if payload.is_default:
            new_pm.is_default = True
    else:
        new_pm = UserPaymentMethods(
            user_id=current_user.user_id,
            provider_type=payload.provider_type,
            account_number=payload.account_number,
            account_label=payload.account_label,
            is_default=payload.is_default
        )
        db.add(new_pm)

    await db.commit()
    await db.refresh(new_pm)

    color = "#fbbf24" if payload.provider_type == "MTN_MOMO" else ("#0284c7" if payload.provider_type == "MOOV_MONEY" else "#0070ba")
    icon = "phone-android" if payload.provider_type == "MTN_MOMO" else ("contactless" if payload.provider_type == "MOOV_MONEY" else "smartphone")
    code = "*880#" if payload.provider_type == "MTN_MOMO" else ("*855#" if payload.provider_type == "MOOV_MONEY" else "*888#")

    return PaymentMethodOutSchema(
        id=str(new_pm.method_id),
        type=new_pm.provider_type,
        title=new_pm.account_label,
        account=new_pm.account_number,
        isDefault=new_pm.is_default,
        color=color,
        icon=icon,
        code=code
    )


@router.get("/history", response_model=List[RechargeHistoryOutSchema])
async def get_payment_history(
    current_user: Users = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Returns user payment and wallet recharge history from PostgreSQL.
    """
    query = (
        select(Payments)
        .where(Payments.user_id == current_user.user_id)
        .order_by(Payments.created_at.desc())
    )
    result = await db.execute(query)
    payments = result.scalars().all()

    items = []
    for p in payments:
        op_label = "MTN Mobile Money" if p.gateway == PaymentGatewayEnum.FEDAPAY else (
            "Moov Money Flooz" if p.gateway == PaymentGatewayEnum.KKIAPAY else "Mobile Money"
        )
        date_str = p.created_at.strftime("%d/%m/%Y, %H:%M")
        items.append(
            RechargeHistoryOutSchema(
                id=str(p.payment_id),
                amount=float(p.amount),
                operator=op_label,
                phone=p.phone_number,
                date=date_str,
                status=p.status.value
            )
        )

    return items


@router.post("/wallet/recharge", response_model=RechargeHistoryOutSchema)
async def recharge_wallet(
    payload: WalletRechargeRequestSchema,
    current_user: Users = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Recharges the university wallet and records transaction in PostgreSQL.
    """
    gateway_val = PaymentGatewayEnum.FEDAPAY if "MTN" in payload.operator.upper() else PaymentGatewayEnum.KKIAPAY

    # 1. Update wallet balance in PostgreSQL
    wallet_query = await db.execute(
        select(Wallets).where(Wallets.user_id == current_user.user_id)
    )
    wallet = wallet_query.scalars().first()
    if wallet:
        wallet.balance = float(wallet.balance) + payload.amount
    else:
        wallet = Wallets(
            user_id=current_user.user_id,
            balance=payload.amount,
            currency="FCFA"
        )
        db.add(wallet)

    # 2. Record payment in PostgreSQL
    payment = Payments(
        user_id=current_user.user_id,
        transaction_reference=f"PAY-RECHARGE-{uuid.uuid4().hex[:8].upper()}",
        gateway=gateway_val,
        amount=payload.amount,
        phone_number=payload.phone_number,
        status=PaymentStatusEnum.SUCCESSFUL
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    # 3. Record persistent notification in PostgreSQL
    from app.services.notification_service import notification_service
    await notification_service.create_user_notification(
        db=db,
        user_id=current_user.user_id,
        title="Recharge Portefeuille Validée",
        message=f"Votre portefeuille ePass a été crédité de {payload.amount:.0f} FCFA via {payload.operator}.",
        category="WALLET",
        tone="success",
        channel="PUSH",
        is_sent=True
    )

    return RechargeHistoryOutSchema(
        id=str(payment.payment_id),
        amount=float(payment.amount),
        operator=payload.operator,
        phone=payment.phone_number,
        date=datetime.now(timezone.utc).strftime("%d/%m/%Y, %H:%M"),
        status="SUCCESSFUL"
    )


# -------------------------------------------------------------------------
# MTN MoMo Direct (MoMoPay / Collection Push USSD 0 Frais Étudiant)
# -------------------------------------------------------------------------
from pydantic import BaseModel
from datetime import timedelta
from app.services.momo_service import momo_service
from app.models.trip_model import Trips
from app.models.ticket_model import Tickets, TicketStatusEnum
from app.models.user_model import UserRoleEnum
from app.services.ticket_engine_service import generate_encrypted_qr_payload, generate_secure_sms_otp


class MoMoInitiateRequestSchema(BaseModel):
    trip_id: uuid.UUID
    phone_number: str
    amount: float = 150.0


@router.post("/momo/initiate")
async def initiate_momo_payment(
    payload: MoMoInitiateRequestSchema,
    current_user: Users = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Déclenche un prélèvement USSD direct via l'API MTN MoMo (Collection / MoMoPay).
    Frais client : 0 FCFA. L'étudiant reçoit un pop-up GSM sur son téléphone (*880#).
    """
    # 1. Vérifier la disponibilité du trajet
    trip_query = await db.execute(select(Trips).where(Trips.trip_id == payload.trip_id))
    trip = trip_query.scalars().first()
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trajet universitaire introuvable."
        )

    if trip.available_seats <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Désolé, ce bus est complet."
        )

    # 2. Déclencher la requête MTN MoMo
    ref_uuid = str(uuid.uuid4())
    momo_res = await momo_service.request_to_pay(
        amount=payload.amount,
        phone_number=payload.phone_number,
        reference_id=ref_uuid,
        external_id=f"TRIP-{str(payload.trip_id)[:8].upper()}",
        payer_message="Achat Billet ePass Campus Bénin (0 FCFA frais)",
        payee_note="ePass Campus Bénin",
        currency="XOF"
    )

    # 3. Enregistrer la transaction initiée en BDD
    clean_phone = payload.phone_number.replace(" ", "")
    payment = Payments(
        user_id=current_user.user_id,
        transaction_reference=ref_uuid,
        gateway=PaymentGatewayEnum.MTN_MOMO,
        gateway_reference=f"MOMO_{ref_uuid[:8]}_{payload.trip_id}",
        amount=payload.amount,
        phone_number=clean_phone,
        status=PaymentStatusEnum.PENDING
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    return {
        "success": True,
        "reference_id": ref_uuid,
        "trip_id": str(payload.trip_id),
        "amount": payload.amount,
        "phone_number": clean_phone,
        "status": "PENDING",
        "merchant_code": "*880#",
        "message": "Invite Push USSD envoyée sur votre numéro MTN (*880#). Saisissez votre code PIN sans frais.",
    }


@router.get("/momo/status/{reference_id}")
async def check_momo_payment_status(
    reference_id: str,
    current_user: Users = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Vérifie le statut de validation du paiement MoMo.
    Dès validation, génère le billet électronique et alerte les contrôleurs et chauffeurs en temps réel.
    """
    query = await db.execute(
        select(Payments).where(Payments.transaction_reference == reference_id)
    )
    payment = query.scalars().first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction introuvable."
        )

    # Si déjà réussi, retourner le billet existant
    if payment.status == PaymentStatusEnum.SUCCESSFUL:
        t_query = await db.execute(select(Tickets).where(Tickets.payment_id == payment.payment_id))
        existing_ticket = t_query.scalars().first()
        return {
            "status": "SUCCESSFUL",
            "message": "Paiement déjà validé.",
            "ticket_id": str(existing_ticket.ticket_id) if existing_ticket else None,
            "sms_code": existing_ticket.sms_backup_code if existing_ticket else None,
            "qr_token": existing_ticket.qr_code_token if existing_ticket else None,
        }

    # Interroger la passerelle MoMo
    momo_status = await momo_service.get_transaction_status(reference_id)
    if momo_status.get("status") == "SUCCESSFUL":
        payment.status = PaymentStatusEnum.SUCCESSFUL
        trip_id = None
        if payment.gateway_reference:
            raw_tid = payment.gateway_reference.split("_")[-1]
            try:
                trip_id = uuid.UUID(raw_tid)
            except Exception:
                trip_id = None

        # Récupérer le trajet
        trip = None
        if trip_id:
            t_res = await db.execute(select(Trips).where(Trips.trip_id == trip_id))
            trip = t_res.scalars().first()

        if trip:
            trip.available_seats = max(0, trip.available_seats - 1)

        # Génération du billet
        ticket_id = uuid.uuid4()
        qr_token = generate_encrypted_qr_payload(str(ticket_id), str(current_user.user_id), str(trip_id or uuid.uuid4()))
        sms_otp = generate_secure_sms_otp(8)
        formatted_code = f"{sms_otp[:4]}-{sms_otp[4:]}" if len(sms_otp) == 8 else sms_otp

        now = datetime.now(timezone.utc)
        initial_exp = (trip.departure_time if trip else None) or (now + timedelta(hours=4))
        final_exp = initial_exp + timedelta(days=7)

        ticket = Tickets(
            ticket_id=ticket_id,
            user_id=current_user.user_id,
            trip_id=trip_id or trip.trip_id if trip else uuid.uuid4(),
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

        # Notification Étudiant
        from app.services.notification_service import notification_service
        await notification_service.create_user_notification(
            db=db,
            user_id=current_user.user_id,
            title="🎟️ Pass MoMoPay Validé (0F Frais)",
            message=f"Paiement MTN MoMo de {float(payment.amount):.0f} FCFA reçu sans frais. Ticket #{formatted_code} disponible hors-ligne.",
            category="PAYMENT",
            tone="success",
            channel="PUSH",
            is_sent=True
        )

        # Notification Temps Réel aux Contrôleurs & Chauffeurs
        try:
            route_name = trip.route.route_name if (trip and trip.route) else "Ligne Campus"
            ctrl_query = await db.execute(
                select(Users).where(Users.role == UserRoleEnum.CONTROLLER, Users.is_active == True)
            )
            controllers = ctrl_query.scalars().all()
            for ctrl in controllers:
                await notification_service.create_user_notification(
                    db=db,
                    user_id=ctrl.user_id,
                    title="⚡ Validation MoMoPay en Direct",
                    message=f"{current_user.first_name} {current_user.last_name} ({current_user.matricule_uac or 'Étudiant'}) vient de payer par MoMoPay sans frais ({float(payment.amount):.0f} FCFA - {route_name}). Billet #{formatted_code}.",
                    category="TICKET_VALIDATION",
                    tone="info",
                    channel="PUSH",
                    is_sent=True
                )

            if trip and trip.bus and trip.bus.driver_id:
                await notification_service.create_user_notification(
                    db=db,
                    user_id=trip.bus.driver_id,
                    title="👤 Nouveau Passager MoMo",
                    message=f"{current_user.first_name} {current_user.last_name} a validé sa place via MTN MoMo. Billet #{formatted_code}.",
                    category="TRIP_UPDATE",
                    tone="info",
                    channel="PUSH",
                    is_sent=True
                )
        except Exception as notif_err:
            logger.warning(f"Erreur notification personnel: {notif_err}")

        return {
            "status": "SUCCESSFUL",
            "message": "Paiement MTN MoMo validé avec succès sans frais client.",
            "ticket_id": str(ticket.ticket_id),
            "sms_code": formatted_code,
            "qr_token": ticket.qr_code_token,
            "amount": float(payment.amount),
        }

    return {
        "status": "PENDING",
        "message": "En attente de validation du code secret MoMo sur votre téléphone (*880#).",
        "reference_id": reference_id,
    }


@router.post("/momo/callback")
async def momo_webhook_callback(
    payload: dict,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Webhook officiel appelé par MTN MoMo dès la validation du Push USSD.
    """
    ref_id = payload.get("financialTransactionId") or payload.get("referenceId")
    status_val = payload.get("status", "SUCCESSFUL")

    if ref_id:
        query = await db.execute(
            select(Payments).where(Payments.transaction_reference == ref_id)
        )
        payment = query.scalars().first()
        if payment and status_val == "SUCCESSFUL":
            payment.status = PaymentStatusEnum.SUCCESSFUL
            await db.commit()

    return {"status": "ok"}

