import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class LandmarkSchema(BaseModel):
    name: str = Field(..., example="BU Centrale")
    lat: float = Field(..., example=6.4485)
    lon: float = Field(..., example=2.3562)
    type: str = Field("hub", example="library")  # hub, library, stop, gate


class CampusBaseSchema(BaseModel):
    code: str = Field(..., example="UAC")
    name: str = Field(..., example="Université d'Abomey-Calavi")
    city: str = Field(..., example="Abomey-Calavi")
    latitude: float = Field(6.4474, example=6.4474)
    longitude: float = Field(2.3557, example=2.3557)
    zoom_level: float = Field(15.0, example=15.0)
    is_active: bool = Field(True, example=True)
    support_phone: Optional[str] = Field(None, example="+2290121360100")
    support_whatsapp: Optional[str] = Field(None, example="+2290197000000")
    support_email: Optional[str] = Field(None, example="support.transport@uac.bj")
    office_location: Optional[str] = Field(None, example="Bâtiment Administratif et d'Accueil • Campus Calavi")
    office_hours: Optional[str] = Field("Du Lundi au Vendredi : 08h00 - 17h30", example="Du Lundi au Vendredi : 08h00 - 17h30")
    subsidized_price: Optional[float] = Field(100.0, example=100.0)
    landmarks: Optional[List[Dict[str, Any]]] = Field(default_factory=list)


class CampusCreateSchema(CampusBaseSchema):
    pass


class CampusUpdateSchema(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    zoom_level: Optional[float] = None
    is_active: Optional[bool] = None
    support_phone: Optional[str] = None
    support_whatsapp: Optional[str] = None
    support_email: Optional[str] = None
    office_location: Optional[str] = None
    office_hours: Optional[str] = None
    subsidized_price: Optional[float] = None
    landmarks: Optional[List[Dict[str, Any]]] = None


class CampusOutSchema(CampusBaseSchema):
    campus_id: uuid.UUID

    class Config:
        from_attributes = True
