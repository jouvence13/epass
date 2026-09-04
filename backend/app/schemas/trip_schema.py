import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from app.models.trip_model import TripStatusEnum
from app.schemas.fleet_schema import RouteOutSchema, BusOutSchema
from app.schemas.user_schema import UserProfileSchema


class TripCreateSchema(BaseModel):
    route_id: uuid.UUID
    bus_id: uuid.UUID
    driver_id: uuid.UUID
    departure_time: datetime
    estimated_arrival_time: datetime
    total_seats: int = Field(50, ge=1, le=100)


class TripUpdateStatusSchema(BaseModel):
    status: TripStatusEnum
    delay_minutes: Optional[int] = Field(0, ge=0)
    delay_reason: Optional[str] = None
    actual_departure_time: Optional[datetime] = None


class TripOutSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    trip_id: uuid.UUID
    route_id: uuid.UUID
    bus_id: uuid.UUID
    driver_id: uuid.UUID
    departure_time: datetime
    estimated_arrival_time: datetime
    actual_departure_time: Optional[datetime] = None
    status: TripStatusEnum
    total_seats: int
    available_seats: int
    delay_minutes: int = 0
    delay_reason: Optional[str] = None
    route: Optional[RouteOutSchema] = None
    bus: Optional[BusOutSchema] = None
    created_at: datetime

    # Frontend-aligned computed/helper fields
    formatted_time: Optional[str] = None      # e.g. "07:30 - Ligne A"
    seats_label: Optional[str] = None         # e.g. "32/50 places"
    full: Optional[bool] = None               # true if available_seats <= 0
    origin_name: Optional[str] = None         # e.g. "Calavi Campus"
    destination_name: Optional[str] = None    # e.g. "Cotonou Centre"
    price: Optional[float] = 250.00           # e.g. 250 FCFA
    duration: Optional[str] = None            # e.g. "35 min"


class TripSearchFilterSchema(BaseModel):
    origin_stop_id: Optional[uuid.UUID] = None
    destination_stop_id: Optional[uuid.UUID] = None
    departure_date: Optional[datetime] = None
    status: Optional[TripStatusEnum] = TripStatusEnum.SCHEDULED


# ==============================================================================
# Driver Hub & Active Trip Schemas
# ==============================================================================

class DriverActiveTripOutSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    trip_id: uuid.UUID
    route_title: str                           # e.g. "Campus Express Route 4"
    next_stop_name: str                        # e.g. "Science Block"
    next_stop_eta_minutes: int                 # e.g. 5
    capacity_num: int                          # Current boarded count (e.g. 32)
    capacity_total: int                        # Total bus capacity (e.g. 50)
    capacity_percentage: int                   # e.g. 64%
    bus_code: str                              # e.g. "BUS-UAC-01" or "Bus #402"
    status: TripStatusEnum
    is_live: bool = True
    delay_minutes: int = 0
    delay_reason: Optional[str] = None
    departure_time: datetime
