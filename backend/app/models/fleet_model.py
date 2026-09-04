import enum
import uuid
from typing import List, Optional
from sqlalchemy import (
    Boolean,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry

from app.models.base import Base, TimestampMixin


class BusStatusEnum(str, enum.Enum):
    OPERATIONAL = "OPERATIONAL"
    OUT_OF_SERVICE = "OUT_OF_SERVICE"
    MAINTENANCE = "MAINTENANCE"


class Buses(Base, TimestampMixin):
    __tablename__ = "buses"

    bus_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    immatriculation_number: Mapped[str] = mapped_column(
        String(30),
        unique=True,
        nullable=False,
        index=True
    )
    bus_code: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        nullable=False,
        index=True
    )
    max_capacity: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    status: Mapped[BusStatusEnum] = mapped_column(
        Enum(BusStatusEnum, name="bus_status_enum"),
        default=BusStatusEnum.OPERATIONAL,
        nullable=False
    )
    current_driver_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.user_id"),
        nullable=True
    )

    # Relationships
    current_driver: Mapped[Optional["Users"]] = relationship("Users", foreign_keys=[current_driver_id])
    trips: Mapped[List["Trips"]] = relationship("Trips", back_populates="bus")
    gps_logs: Mapped[List["GpsLogs"]] = relationship("GpsLogs", back_populates="bus")


class Stops(Base, TimestampMixin):
    __tablename__ = "stops"

    stop_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    stop_name: Mapped[str] = mapped_column(String(150), nullable=False)
    # GeoAlchemy2 Point Geometry with SRID 4326 (WGS 84)
    geolocation = mapped_column(
        Geometry(geometry_type="POINT", srid=4326),
        nullable=False,
        index=True
    )

    @property
    def latitude(self) -> float:
        if self.geolocation is not None:
            try:
                from geoalchemy2.shape import to_shape
                return float(to_shape(self.geolocation).y)
            except Exception:
                return 6.4474
        return 6.4474

    @property
    def longitude(self) -> float:
        if self.geolocation is not None:
            try:
                from geoalchemy2.shape import to_shape
                return float(to_shape(self.geolocation).x)
            except Exception:
                return 2.3557
        return 2.3557

    # Relationships
    origin_routes: Mapped[List["Routes"]] = relationship(
        "Routes",
        foreign_keys="Routes.origin_stop_id",
        back_populates="origin_stop"
    )
    destination_routes: Mapped[List["Routes"]] = relationship(
        "Routes",
        foreign_keys="Routes.destination_stop_id",
        back_populates="destination_stop"
    )
    route_stops: Mapped[List["RouteStops"]] = relationship("RouteStops", back_populates="stop")


class Routes(Base, TimestampMixin):
    __tablename__ = "routes"

    route_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    route_name: Mapped[str] = mapped_column(String(150), nullable=False)
    origin_stop_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("stops.stop_id"),
        nullable=False
    )
    destination_stop_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("stops.stop_id"),
        nullable=False
    )
    base_price: Mapped[float] = mapped_column(
        Numeric(10, 2),
        default=250.00,
        nullable=False
    )
    estimated_duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    origin_stop: Mapped["Stops"] = relationship("Stops", foreign_keys=[origin_stop_id], back_populates="origin_routes")
    destination_stop: Mapped["Stops"] = relationship("Stops", foreign_keys=[destination_stop_id], back_populates="destination_routes")
    trips: Mapped[List["Trips"]] = relationship("Trips", back_populates="route")
    route_stops: Mapped[List["RouteStops"]] = relationship(
        "RouteStops",
        back_populates="route",
        order_by="RouteStops.stop_order",
        cascade="all, delete-orphan"
    )


class RouteStops(Base, TimestampMixin):
    __tablename__ = "route_stops"

    route_stop_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    route_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("routes.route_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    stop_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("stops.stop_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    stop_order: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    estimated_minutes_from_origin: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    connection_label: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Relationships
    route: Mapped["Routes"] = relationship("Routes", back_populates="route_stops")
    stop: Mapped["Stops"] = relationship("Stops", back_populates="route_stops")

