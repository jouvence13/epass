import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy import Boolean, Float, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class Campuses(Base, TimestampMixin):
    __tablename__ = "campuses"

    campus_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    code: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        nullable=False,
        index=True
    )  # e.g. "UAC", "UP", "UNA", "UNSTIM"
    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )  # e.g. "Université d'Abomey-Calavi"
    city: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )  # e.g. "Abomey-Calavi"
    latitude: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=6.4474
    )
    longitude: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=2.3557
    )
    zoom_level: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=15.0
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    landmarks: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(
        JSONB,
        nullable=True,
        default=list
    )
