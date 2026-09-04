import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from app.models.user_model import UserRoleEnum, KycStatusEnum, DocumentTypeEnum


# ==============================================================================
# Auth & Registration
# ==============================================================================

class UserRegistrationSchema(BaseModel):
    matricule_uac: Optional[str] = Field(None, example="10293847")
    phone_number: str = Field(..., example="+22997000000")
    first_name: str = Field(..., example="Koffi")
    last_name: str = Field(..., example="MENSAH")
    password: str = Field(..., min_length=8, example="SecretPassword123")
    role: Optional[UserRoleEnum] = UserRoleEnum.STUDENT


class UserLoginSchema(BaseModel):
    phone_number: str = Field(..., example="+22997000000")
    password: str = Field(..., example="SecretPassword123")


class TokenResponseSchema(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: uuid.UUID
    role: UserRoleEnum
    kyc_status: KycStatusEnum


class RefreshTokenRequestSchema(BaseModel):
    refresh_token: str


# ==============================================================================
# User Profile & KYC
# ==============================================================================

class KycDocumentOutSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    document_id: uuid.UUID
    document_type: DocumentTypeEnum
    document_url: str
    verification_status: KycStatusEnum
    rejection_reason: Optional[str] = None
    academic_year: str
    created_at: datetime


class UserProfileSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    matricule_uac: Optional[str] = None
    phone_number: str
    first_name: str
    last_name: str
    role: UserRoleEnum
    kyc_status: KycStatusEnum
    last_kyc_verification_date: Optional[datetime] = None
    next_kyc_due_date: Optional[datetime] = None
    is_active: bool
    created_at: datetime


class KycSubmissionResponseSchema(BaseModel):
    message: str
    kyc_status: str
    submitted_at: datetime


class KycModerationRequestSchema(BaseModel):
    user_id: uuid.UUID
    action: KycStatusEnum # APPROVED or REJECTED
    rejection_reason: Optional[str] = None
