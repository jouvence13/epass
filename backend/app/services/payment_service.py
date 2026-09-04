import uuid
from typing import Any, Dict, List, Optional
import httpx
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.payment_model import (
    PaymentGatewayEnum,
    PaymentStatusEnum,
    Payments,
    Wallets,
    UserPaymentMethods,
)


class PaymentGatewayService:
    """Service to interact with Mobile Money gateways and manage CROUS Wallets & Payment Methods."""

    @staticmethod
    async def initialize_fedapay_transaction(
        amount: float,
        description: str,
        customer_phone: str,
        customer_firstname: str,
        customer_lastname: str,
        custom_metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Initialize a transaction with FedaPay Sandbox / Live API."""
        ref = f"UAC-FEDA-{uuid.uuid4().hex[:12].upper()}"
        checkout_url = f"https://sandbox-checkout.fedapay.com/pay/{ref}"
        
        return {
            "transaction_reference": ref,
            "gateway_reference": f"FP_TXN_{uuid.uuid4().hex[:10]}",
            "checkout_url": checkout_url,
            "status": PaymentStatusEnum.INITIATED,
            "gateway": PaymentGatewayEnum.FEDAPAY
        }

    @staticmethod
    async def initialize_kkiapay_transaction(
        amount: float,
        customer_phone: str,
        customer_name: str,
        custom_metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Initialize a transaction with KkiaPay API."""
        ref = f"UAC-KKIA-{uuid.uuid4().hex[:12].upper()}"
        checkout_url = f"https://widget.kkiapay.me?amount={int(amount)}&phone={customer_phone}&ref={ref}"
        
        return {
            "transaction_reference": ref,
            "gateway_reference": f"KKIA_TXN_{uuid.uuid4().hex[:10]}",
            "checkout_url": checkout_url,
            "status": PaymentStatusEnum.INITIATED,
            "gateway": PaymentGatewayEnum.KKIAPAY
        }

    @staticmethod
    async def get_or_create_wallet(
        db: AsyncSession,
        user_id: uuid.UUID,
        initial_balance: float = 2300.00
    ) -> Wallets:
        """Fetch existing user wallet or initialize a default subsidized balance."""
        query = await db.execute(select(Wallets).where(Wallets.user_id == user_id))
        wallet = query.scalars().first()
        if not wallet:
            wallet = Wallets(
                user_id=user_id,
                balance=initial_balance,
                currency="FCFA"
            )
            db.add(wallet)
            await db.commit()
            await db.refresh(wallet)
        return wallet

    @staticmethod
    async def debit_wallet(
        db: AsyncSession,
        user_id: uuid.UUID,
        amount: float
    ) -> bool:
        """Deduct funds from user wallet if balance is sufficient."""
        wallet = await PaymentGatewayService.get_or_create_wallet(db, user_id)
        if float(wallet.balance) < amount:
            return False
        wallet.balance = float(wallet.balance) - amount
        await db.commit()
        await db.refresh(wallet)
        return True

    @staticmethod
    async def recharge_wallet(
        db: AsyncSession,
        user_id: uuid.UUID,
        amount: float,
        operator: str,
        phone_number: str
    ) -> Wallets:
        """Credit funds to user wallet and record transaction."""
        wallet = await PaymentGatewayService.get_or_create_wallet(db, user_id)
        wallet.balance = float(wallet.balance) + amount

        # Create corresponding payment record
        ref = f"RCH-{operator.upper()}-{uuid.uuid4().hex[:8].upper()}"
        payment = Payments(
            user_id=user_id,
            transaction_reference=ref,
            gateway=PaymentGatewayEnum.FEDAPAY if "mtn" in operator.lower() else PaymentGatewayEnum.KKIAPAY,
            amount=amount,
            phone_number=phone_number,
            status=PaymentStatusEnum.SUCCESSFUL
        )
        db.add(payment)
        await db.commit()
        await db.refresh(wallet)
        return wallet

    @staticmethod
    async def get_user_payment_methods(
        db: AsyncSession,
        user_id: uuid.UUID,
        default_phone: Optional[str] = None
    ) -> List[UserPaymentMethods]:
        """Fetch user payment methods, seeding defaults with their phone number if none exist."""
        query = await db.execute(
            select(UserPaymentMethods)
            .where(UserPaymentMethods.user_id == user_id)
            .order_by(UserPaymentMethods.created_at.asc())
        )
        methods = list(query.scalars().all())
        if not methods and default_phone:
            phone = default_phone if default_phone.startswith("+229") else f"+229{default_phone.lstrip('+')}"
            defaults = [
                UserPaymentMethods(
                    user_id=user_id,
                    provider_type="MTN_MOMO",
                    account_number=phone,
                    account_label="Compte MTN Mobile Money",
                    is_default=True
                ),
                UserPaymentMethods(
                    user_id=user_id,
                    provider_type="MOOV_MONEY",
                    account_number=phone,
                    account_label="Compte Moov Money",
                    is_default=False
                ),
                UserPaymentMethods(
                    user_id=user_id,
                    provider_type="CELTIIS_CASH",
                    account_number=phone,
                    account_label="Compte Celtiis Cash",
                    is_default=False
                ),
            ]
            db.add_all(defaults)
            await db.commit()
            for m in defaults:
                await db.refresh(m)
            methods = defaults
        return methods


payment_service = PaymentGatewayService()
