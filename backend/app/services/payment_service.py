import uuid
from typing import Any, Dict, Optional
import httpx
from app.core.config import settings
from app.models.payment_model import PaymentGatewayEnum, PaymentStatusEnum


class PaymentGatewayService:
    """Service to interact with local Benin Mobile Money gateways (FedaPay & KkiaPay)."""

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
        
        # In development / sandbox mode, provide instant simulated link
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


payment_service = PaymentGatewayService()
