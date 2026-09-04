import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

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

    return RechargeHistoryOutSchema(
        id=str(payment.payment_id),
        amount=float(payment.amount),
        operator=payload.operator,
        phone=payment.phone_number,
        date=datetime.now(timezone.utc).strftime("%d/%m/%Y, %H:%M"),
        status="SUCCESSFUL"
    )
