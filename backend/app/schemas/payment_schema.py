import uuid
from datetime import datetime
from typing import Any, Dict, Optional, Literal
from pydantic import BaseModel, ConfigDict, Field
from app.models.payment_model import PaymentGatewayEnum, PaymentStatusEnum


class PaymentInitiateRequestSchema(BaseModel):
    trip_id: uuid.UUID
    payment_method: Optional[Literal["mtn", "moov"]] = Field("mtn", example="mtn")
    gateway: Optional[PaymentGatewayEnum] = PaymentGatewayEnum.FEDAPAY
    phone_number: Optional[str] = Field(None, example="97000000")


class PaymentInitiateResponseSchema(BaseModel):
    payment_id: uuid.UUID
    transaction_reference: str
    gateway: PaymentGatewayEnum
    payment_method: Optional[str] = "mtn"
    amount: float
    checkout_url: Optional[str] = None
    status: PaymentStatusEnum
    message: str


class PaymentWebhookPayloadSchema(BaseModel):
    event: str
    gateway: PaymentGatewayEnum
    transaction_reference: str
    gateway_reference: Optional[str] = None
    status: str
    payload: Dict[str, Any]


class PaymentOutSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    payment_id: uuid.UUID
    user_id: uuid.UUID
    transaction_reference: str
    gateway: PaymentGatewayEnum
    gateway_reference: Optional[str] = None
    amount: float
    phone_number: str
    status: PaymentStatusEnum
    created_at: datetime


class PaymentMethodOutSchema(BaseModel):
    id: str
    type: str
    title: str
    account: str
    isDefault: bool
    color: str
    icon: str
    code: str


class RechargeHistoryOutSchema(BaseModel):
    id: str
    amount: float
    operator: str
    phone: str
    date: str
    status: str


class WalletRechargeRequestSchema(BaseModel):
    amount: float = Field(..., gt=0, example=2000.0)
    operator: str = Field(..., example="MTN")
    phone_number: str = Field(..., example="+2290157774305")


class AddPaymentMethodSchema(BaseModel):
    provider_type: str = Field(..., example="MTN_MOMO")  # 'MTN_MOMO' | 'MOOV_MONEY' | 'CELTIIS_CASH'
    account_number: str = Field(..., example="+2290157774305")
    account_label: str = Field(..., example="Mon compte MTN")
    is_default: bool = False


class WalletOutSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    wallet_id: uuid.UUID
    user_id: uuid.UUID
    balance: float
    currency: str = "FCFA"


class WalletBalanceOutSchema(BaseModel):
    balance: float
    currency: str = "FCFA"

