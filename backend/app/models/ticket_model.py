import enum
import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class TicketStatusEnum(str, enum.Enum):
    ISSUED = "ISSUED"
    VALIDATED = "VALIDATED"
    EXPIRED = "EXPIRED"
    RECYCLED = "RECYCLED"
    CANCELLED = "CANCELLED"


class Tickets(Base, TimestampMixin):
    __tablename__ = "tickets"

    ticket_id: Mapped[uuid.UUID] = mapped_column(
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
    trip_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("trips.trip_id"),
        nullable=False,
        index=True
    )
    payment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payments.payment_id"),
        unique=True,
        nullable=False
    )
    qr_code_token: Mapped[str] = mapped_column(
        String(500),
        unique=True,
        nullable=False,
        index=True
    )
    sms_backup_code: Mapped[str] = mapped_column(
        String(8),
        unique=True,
        nullable=False,
        index=True
    )
    status: Mapped[TicketStatusEnum] = mapped_column(
        Enum(TicketStatusEnum, name="ticket_status_enum"),
        default=TicketStatusEnum.ISSUED,
        nullable=False,
        index=True
    )
    recycle_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    initial_expiration_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )
    final_expiration_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True
    )
    validated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    validated_by_driver_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id"),
        nullable=True
    )

    __table_args__ = (
        CheckConstraint("recycle_count <= 1", name="check_single_recycle"),
    )

    # Relationships
    user: Mapped["Users"] = relationship("Users", back_populates="tickets", foreign_keys=[user_id])
    trip: Mapped["Trips"] = relationship("Trips", back_populates="tickets")
    payment: Mapped["Payments"] = relationship("Payments", back_populates="ticket")
    validated_by_driver: Mapped[Optional["Users"]] = relationship("Users", foreign_keys=[validated_by_driver_id])
    notifications: Mapped[List["Notifications"]] = relationship("Notifications", back_populates="ticket")
