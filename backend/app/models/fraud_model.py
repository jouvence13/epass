import uuid
from typing import Optional
from sqlalchemy import (
    Boolean,
    Float,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class InfractionTypes(Base, TimestampMixin):
    __tablename__ = "infraction_types"

    infraction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    key: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )
    label: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )
    icon: Mapped[str] = mapped_column(
        String(50),
        default="warning",
        nullable=False
    )
    severity: Mapped[str] = mapped_column(
        String(50),
        default="MEDIUM",
        nullable=False
    )
    penalty_amount: Mapped[float] = mapped_column(
        Float,
        default=500.0,
        nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )

    # Relationships
    fraud_reports: Mapped[list["FraudReports"]] = relationship(
        "FraudReports",
        back_populates="infraction_type",
        primaryjoin="InfractionTypes.key == foreign(FraudReports.infraction_type_key)"
    )


class FraudReports(Base, TimestampMixin):
    __tablename__ = "fraud_reports"

    report_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    pv_code: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )
    controller_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id"),
        nullable=False,
        index=True
    )
    trip_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("trips.trip_id"),
        nullable=True,
        index=True
    )
    student_identifier: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True
    )
    infraction_type_key: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True
    )
    penalty_amount: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="TRANSMITTED",
        nullable=False,
        index=True
    )

    # Relationships
    controller: Mapped["Users"] = relationship("Users", foreign_keys=[controller_id])
    trip: Mapped[Optional["Trips"]] = relationship("Trips", foreign_keys=[trip_id])
    infraction_type: Mapped[Optional["InfractionTypes"]] = relationship(
        "InfractionTypes",
        back_populates="fraud_reports",
        primaryjoin="foreign(FraudReports.infraction_type_key) == InfractionTypes.key"
    )
