import enum
import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry

from app.models.base import Base, TimestampMixin


class TripStatusEnum(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    BOARDING = "BOARDING"
    EN_ROUTE = "EN_ROUTE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Trips(Base, TimestampMixin):
    __tablename__ = "trips"

    trip_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    route_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("routes.route_id"),
        nullable=False,
        index=True
    )
    bus_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("buses.bus_id"),
        nullable=False,
        index=True
    )
    driver_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id"),
        nullable=False,
        index=True
    )
    departure_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True
    )
    estimated_arrival_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )
    actual_departure_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    status: Mapped[TripStatusEnum] = mapped_column(
        Enum(TripStatusEnum, name="trip_status_enum"),
        default=TripStatusEnum.SCHEDULED,
        nullable=False,
        index=True
    )
    total_seats: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    available_seats: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    delay_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    delay_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    __table_args__ = (
        CheckConstraint("available_seats >= 0", name="check_available_seats_non_negative"),
    )

    # Relationships
    route: Mapped["Routes"] = relationship("Routes", back_populates="trips")
    bus: Mapped["Buses"] = relationship("Buses", back_populates="trips")
    driver: Mapped["Users"] = relationship("Users", foreign_keys=[driver_id])
    tickets: Mapped[List["Tickets"]] = relationship("Tickets", back_populates="trip")
    gps_logs: Mapped[List["GpsLogs"]] = relationship("GpsLogs", back_populates="trip")


class GpsLogs(Base):
    __tablename__ = "gps_logs"

    log_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )
    bus_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("buses.bus_id"),
        nullable=False,
        index=True
    )
    trip_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("trips.trip_id"),
        nullable=False,
        index=True
    )
    position = mapped_column(
        Geometry(geometry_type="POINT", srid=4326),
        nullable=False,
        index=True
    )
    speed_kmh: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0, nullable=False)
    bearing_degrees: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True
    )

    # Relationships
    bus: Mapped["Buses"] = relationship("Buses", back_populates="gps_logs")
    trip: Mapped["Trips"] = relationship("Trips", back_populates="gps_logs")
