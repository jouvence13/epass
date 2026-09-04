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
