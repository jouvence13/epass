import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class GpsDriverPayloadSchema(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, example=6.447412)
    longitude: float = Field(..., ge=-180.0, le=180.0, example=2.355721)
    speed_kmh: float = Field(0.0, ge=0.0, example=38.0)
    bearing: float = Field(0.0, ge=0.0, le=360.0, example=182.5)


class GpsTelemetryBroadcastSchema(BaseModel):
    trip_id: uuid.UUID
    bus_code: str = Field(..., example="BUS-UAC-01")
    latitude: float = Field(..., example=6.447412)
    longitude: float = Field(..., example=2.355721)
    speed_kmh: float = Field(..., example=38.0)
    bearing: float = Field(..., example=182.5)
    eta_minutes: int = Field(..., example=8)
    delay_minutes: int = Field(0, example=0)
    is_operational: bool = True
    timestamp: str
