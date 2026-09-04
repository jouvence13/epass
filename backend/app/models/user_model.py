import enum
import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class UserRoleEnum(str, enum.Enum):
    STUDENT = "STUDENT"
    DRIVER = "DRIVER"
    CONTROLLER = "CONTROLLER"
    ADMIN_CROUS = "ADMIN_CROUS"
    SUPERADMIN = "SUPERADMIN"


class KycStatusEnum(str, enum.Enum):
    NOT_SUBMITTED = "NOT_SUBMITTED"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"


class DocumentTypeEnum(str, enum.Enum):
    STUDENT_CARD = "STUDENT_CARD"
    CIP_IDENTITY = "CIP_IDENTITY"
    CNI = "CNI"
    PASSPORT = "PASSPORT"


class Users(Base, TimestampMixin):
    __tablename__ = "users"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    matricule_uac: Mapped[Optional[str]] = mapped_column(
        String(50),
        unique=True,
        nullable=True,
        index=True
    )
    phone_number: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        nullable=False,
        index=True
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRoleEnum] = mapped_column(
        Enum(UserRoleEnum, name="user_role_enum"),
        default=UserRoleEnum.STUDENT,
        nullable=False
    )
    kyc_status: Mapped[KycStatusEnum] = mapped_column(
        Enum(KycStatusEnum, name="kyc_status_enum"),
        default=KycStatusEnum.PENDING,
        nullable=False,
        index=True
    )
    last_kyc_verification_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    next_kyc_due_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    kyc_documents: Mapped[List["KycDocuments"]] = relationship(
        "KycDocuments",
        back_populates="user",
        foreign_keys="KycDocuments.user_id",
        cascade="all, delete-orphan"
    )
    tickets: Mapped[List["Tickets"]] = relationship("Tickets", back_populates="user", foreign_keys="Tickets.user_id")
    payments: Mapped[List["Payments"]] = relationship("Payments", back_populates="user")
    wallet: Mapped[Optional["Wallets"]] = relationship("Wallets", back_populates="user", uselist=False, cascade="all, delete-orphan")
    payment_methods: Mapped[List["UserPaymentMethods"]] = relationship("UserPaymentMethods", back_populates="user", cascade="all, delete-orphan")
    notifications: Mapped[List["Notifications"]] = relationship("Notifications", back_populates="user")


class KycDocuments(Base):
    __tablename__ = "kyc_documents"

    document_id: Mapped[uuid.UUID] = mapped_column(
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
    document_type: Mapped[DocumentTypeEnum] = mapped_column(
        Enum(DocumentTypeEnum, name="document_type_enum"),
        nullable=False
    )
    document_url: Mapped[str] = mapped_column(String(500), nullable=False)
    verification_status: Mapped[KycStatusEnum] = mapped_column(
        Enum(KycStatusEnum, name="kyc_status_enum"),
        default=KycStatusEnum.PENDING,
        nullable=False
    )
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    validated_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id"),
        nullable=True
    )
    validated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    academic_year: Mapped[str] = mapped_column(String(10), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relationships
    user: Mapped["Users"] = relationship(
        "Users",
        back_populates="kyc_documents",
        foreign_keys=[user_id]
    )
    validator: Mapped[Optional["Users"]] = relationship(
        "Users",
        foreign_keys=[validated_by]
    )
