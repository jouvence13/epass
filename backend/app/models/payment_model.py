import enum
import uuid
from typing import Any, Dict, Optional
from sqlalchemy import (
    Boolean,
    Enum,
    ForeignKey,
    Numeric,
    String,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class PaymentStatusEnum(str, enum.Enum):
    INITIATED = "INITIATED"
    PENDING = "PENDING"
    SUCCESSFUL = "SUCCESSFUL"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class PaymentGatewayEnum(str, enum.Enum):
    FEDAPAY = "FEDAPAY"
    KKIAPAY = "KKIAPAY"


class Payments(Base, TimestampMixin):
    __tablename__ = "payments"

    payment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id"),
        nullable=False,
        index=True
    )
    transaction_reference: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True
    )
    gateway: Mapped[PaymentGatewayEnum] = mapped_column(
        Enum(PaymentGatewayEnum, name="payment_gateway_enum"),
        nullable=False
    )
    gateway_reference: Mapped[Optional[str]] = mapped_column(
        String(150),
        unique=True,
        nullable=True
    )
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    phone_number: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[PaymentStatusEnum] = mapped_column(
        Enum(PaymentStatusEnum, name="payment_status_enum"),
        default=PaymentStatusEnum.INITIATED,
        nullable=False,
        index=True
    )
    callback_payload: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONB, nullable=True)

    # Relationships
    user: Mapped["Users"] = relationship("Users", back_populates="payments")
    ticket: Mapped[Optional["Tickets"]] = relationship("Tickets", back_populates="payment", uselist=False)


class Wallets(Base, TimestampMixin):
    __tablename__ = "wallets"

    wallet_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True
    )
    balance: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="FCFA", nullable=False)


class UserPaymentMethods(Base, TimestampMixin):
    __tablename__ = "user_payment_methods"

    method_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    provider_type: Mapped[str] = mapped_column(String(30), nullable=False) # 'MTN_MOMO', 'MOOV_MONEY', 'CELTIIS_CASH'
    account_number: Mapped[str] = mapped_column(String(30), nullable=False)
    account_label: Mapped[str] = mapped_column(String(100), nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
