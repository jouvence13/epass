import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class NotificationOutSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    category: str = "GENERAL"
    title: str
    message: str
    time: str
    read: bool = False
    icon: str = "notifications"
    tone: str = "info"


class CreateNotificationRequestSchema(BaseModel):
    title: str = Field(..., max_length=150, example="Information Trafic")
    message: str = Field(..., example="Circulation fluide sur la RNIE 2.")
    category: Optional[str] = Field("GENERAL", example="TRAFFIC")
    tone: Optional[str] = Field("info", example="info")
    channel: Optional[str] = Field("PUSH", example="PUSH")


class MarkNotificationReadRequestSchema(BaseModel):
    notification_id: Optional[str] = None
