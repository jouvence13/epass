import uuid
from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, ConfigDict, Field
from app.models.ticket_model import TicketStatusEnum
from app.schemas.trip_schema import TripOutSchema


# ==============================================================================
# Validation & QR Code Schemas
# ==============================================================================

class TicketValidationRequestSchema(BaseModel):
    scan_mode: str = Field("OPTICAL_QR", example="OPTICAL_QR") # OPTICAL_QR or SMS_CODE
    qr_code_token: Optional[str] = Field(None, example="AES_ENCRYPTED_STRING_HERE")
    sms_backup_code: Optional[str] = Field(None, example="A7B9-X2M4")
    trip_id: Optional[uuid.UUID] = None


class TicketValidationResponseSchema(BaseModel):
    validation_status: str = Field(..., example="ACCESS_GRANTED") # ACCESS_GRANTED or ACCESS_DENIED
    message: str
    student_name: Optional[str] = None
    matricule_uac: Optional[str] = None
    ticket_id: Optional[uuid.UUID] = None
    line_name: Optional[str] = None
    validated_time: Optional[str] = None
    timestamp: datetime


# ==============================================================================
# Student Active Ticket & Live Tracking Schemas (for ActiveTicketScreen.tsx)
# ==============================================================================

class ActiveTicketScreenOutSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ticket_id: uuid.UUID
    trip_id: uuid.UUID
    route_name: str                           # e.g. "Campus Express Route 4"
    student_name: str                         # e.g. "Koffi Alain"
    student_id: str                           # e.g. "Student ID: 2023-4458"
    matricule_uac: Optional[str] = None
    qr_code_token: str                        # e.g. "CROUS-UAC-TICKET-A7B9X2M4" or AES token
    code: str                                 # Formatted SMS backup code: "A7B9-X2M4"
    status: str                               # "Valid Ticket", "Validated", "Expired"
    raw_status: TicketStatusEnum
    recycle_count: int = 0                    # Number of times recycled (max 1)
    available_for_days: int                   # e.g. 6 (days remaining in J+7 window)
    avail_for_label: str                      # e.g. "Available for 6 more days"
    
    # Delay & Incident Alert banner
    has_delay: bool = False
    delay_minutes: int = 0
    delay_title: Optional[str] = None         # e.g. "Delay: +15 min"
    delay_reason: Optional[str] = None        # e.g. "Due to heavy traffic near the central campus roundabout."
    
    # Live Bus Telemetry & Map
    bus_code: str                             # e.g. "Bus #402"
    capacity_percentage: int                  # e.g. 65
    eta_minutes: int                          # e.g. 8
    eta_label: str = "8 min"
    latitude: float                           # Current bus latitude
    longitude: float                          # Current bus longitude
    speed_kmh: float = 0.0


# ==============================================================================
# Passenger Manifest Schemas (for PassengerLookupScreen.tsx & passengers.ts)
# ==============================================================================

class PassengerOutSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str                                   # Ticket UUID or string ID
    name: str                                 # "Koffi Alain"
    matricule: str                            # "UAC-2022-8492"
    phone: str                                # "+229 97 00 11 22"
    stop: str                                 # "Portail Principal" / "Godomey"
    status: Literal["pending", "checked"]     # "pending" or "checked"
    checkedAt: Optional[str] = None           # "07:42 AM" or "Just now"


class PassengerManifestCountsSchema(BaseModel):
    all: int
    pending: int
    checked: int


class PassengerManifestResponseSchema(BaseModel):
    trip_id: uuid.UUID
    trip_title: str                           # "Trip #4022 - Campus to Cotonou"
    counts: PassengerManifestCountsSchema
    passengers: List[PassengerOutSchema]


# ==============================================================================
# Driver Incident & Delay Reporting Schemas (for ReportDelayScreen.tsx)
# ==============================================================================

class DriverReportDelayRequestSchema(BaseModel):
    trip_id: Optional[uuid.UUID] = None
    delay_minutes: int = Field(..., ge=0, example=30)
    incident_type: str = Field("traffic", example="traffic") # traffic, mechanical, roadblock, other
    custom_message: Optional[str] = None


class DriverReportDelayResponseSchema(BaseModel):
    message: str
    trip_id: uuid.UUID
    delay_minutes: int
    incident_type: str
    passengers_notified_count: int


# ==============================================================================
# Driver Alerts Schemas (for AlertsScreen.tsx)
# ==============================================================================

class DriverAlertOutSchema(BaseModel):
    id: str
    icon: str                                 # "warning", "local-gas-station", "chat", "campaign"
    title: str                                # "Delay broadcasted"
    body: str                                 # "+30 min sent to 50 passengers on Route 42."
    time: str                                 # "5 min ago"
    tone: str                                 # Hex color or CSS name


# ==============================================================================
# Ticket Recycling Schemas
# ==============================================================================

class TicketRecycleRequestSchema(BaseModel):
    ticket_id: uuid.UUID
    new_trip_id: uuid.UUID


class TicketRecycleResponseSchema(BaseModel):
    message: str
    ticket_id: uuid.UUID
    new_trip_id: uuid.UUID
    new_qr_code_token: str
    sms_backup_code: str
    recycle_count: int
    final_expiration_date: datetime


class TicketOutSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ticket_id: uuid.UUID
    user_id: uuid.UUID
    trip_id: uuid.UUID
    payment_id: uuid.UUID
    qr_code_token: str
    sms_backup_code: str
    status: TicketStatusEnum
    recycle_count: int
    initial_expiration_date: datetime
    final_expiration_date: datetime
    validated_at: Optional[datetime] = None
    created_at: datetime
    trip: Optional[TripOutSchema] = None
