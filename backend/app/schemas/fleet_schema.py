import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.fleet_model import BusStatusEnum


# ==============================================================================
# Bus Schemas
# ==============================================================================

class BusCreateSchema(BaseModel):
    immatriculation_number: str = Field(..., example="RB-4412-UAC")
    bus_code: str = Field(..., example="BUS-UAC-01")
    max_capacity: int = Field(50, ge=1, le=100)
    status: Optional[BusStatusEnum] = BusStatusEnum.OPERATIONAL
    current_driver_id: Optional[uuid.UUID] = None


class BusUpdateSchema(BaseModel):
    immatriculation_number: Optional[str] = None
    bus_code: Optional[str] = None
    max_capacity: Optional[int] = Field(None, ge=1, le=100)
    status: Optional[BusStatusEnum] = None
    current_driver_id: Optional[uuid.UUID] = None


class BusOutSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    bus_id: uuid.UUID
    immatriculation_number: str
    bus_code: str
    max_capacity: int
    status: BusStatusEnum
    current_driver_id: Optional[uuid.UUID] = None
    created_at: datetime


# ==============================================================================
# Stop & Route Schemas
# ==============================================================================

class StopCreateSchema(BaseModel):
    stop_name: str = Field(..., example="Campus UAC Calavi")
    latitude: float = Field(..., ge=-90.0, le=90.0, example=6.447412)
    longitude: float = Field(..., ge=-180.0, le=180.0, example=2.355721)


class StopOutSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    stop_id: uuid.UUID
    stop_name: str
    latitude: float
    longitude: float
    created_at: datetime


class RouteCreateSchema(BaseModel):
    route_name: str = Field(..., example="Calavi - Étoile Rouge (Cotonou)")
    origin_stop_id: uuid.UUID
    destination_stop_id: uuid.UUID
    base_price: float = Field(150.00, ge=0)
    estimated_duration_minutes: int = Field(..., ge=1, example=35)
    is_active: bool = True


class RouteOutSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    route_id: uuid.UUID
    route_name: str
    origin_stop_id: uuid.UUID
    destination_stop_id: uuid.UUID
    base_price: float
    estimated_duration_minutes: int
    is_active: bool
    origin_stop: Optional[StopOutSchema] = None
    destination_stop: Optional[StopOutSchema] = None
    created_at: datetime
