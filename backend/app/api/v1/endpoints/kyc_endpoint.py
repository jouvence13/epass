from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_async_db
from app.models.user_model import Users, KycDocuments, KycStatusEnum, UserRoleEnum
from app.schemas.user_schema import (
    KycSubmissionResponseSchema,
    KycDocumentOutSchema,
    KycModerationRequestSchema,
)
from app.services.auth_service import get_current_authenticated_user, require_roles
from app.services.kyc_service import submit_user_kyc, moderate_kyc

router = APIRouter(prefix="/kyc", tags=["KYC & Academic Verification"])


@router.post("/upload", response_model=KycSubmissionResponseSchema)
async def upload_academic_documents(
    student_card_file: UploadFile = File(..., description="Scan ou photo de la carte étudiant UAC"),
    identity_file: UploadFile = File(..., description="Certificat d'Identification Personnelle (CIP) ou CNI"),
    academic_year: str = Form("2025-2026"),
    current_user: Users = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Submit academic student credentials for validation (Carte étudiant + CIP).
    Validation status is set to PENDING awaiting CROUS moderation.
    """
    await submit_user_kyc(
        user=current_user,
        student_card_file=student_card_file,
        identity_file=identity_file,
        academic_year=academic_year,
        db=db
    )

    return KycSubmissionResponseSchema(
        message="Documents soumis avec succès. Validation sous 24h par l'administration CROUS.",
        kyc_status=current_user.kyc_status.value,
        submitted_at=datetime.now(timezone.utc)
    )


@router.get("/my-documents", response_model=List[KycDocumentOutSchema])
async def get_my_kyc_documents(
    current_user: Users = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_async_db)
):
    """List documents uploaded by the current student."""
    query = await db.execute(
        select(KycDocuments).where(KycDocuments.user_id == current_user.user_id)
    )
    return query.scalars().all()


@router.get("/pending", response_model=List[KycDocumentOutSchema])
async def list_pending_kyc_submissions(
    current_admin: Users = Depends(require_roles([UserRoleEnum.ADMIN_CROUS, UserRoleEnum.SUPERADMIN])),
    db: AsyncSession = Depends(get_async_db)
):
    """Admin CROUS: List all pending KYC document submissions."""
    query = await db.execute(
        select(KycDocuments).where(KycDocuments.verification_status == KycStatusEnum.PENDING)
    )
    return query.scalars().all()


@router.put("/verify", status_code=status.HTTP_200_OK)
async def verify_kyc_submission(
    payload: KycModerationRequestSchema,
    current_admin: Users = Depends(require_roles([UserRoleEnum.ADMIN_CROUS, UserRoleEnum.SUPERADMIN])),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Admin CROUS: Approve or reject student KYC.
    Approving grants 90 days validity before next mandatory re-verification.
    """
    updated_user = await moderate_kyc(
        target_user_id=payload.user_id,
        moderator=current_admin,
        action=payload.action,
        rejection_reason=payload.rejection_reason or "",
        db=db
    )

    return {
        "message": f"Statut KYC mis à jour : {updated_user.kyc_status.value}",
        "user_id": updated_user.user_id,
        "kyc_status": updated_user.kyc_status,
        "next_kyc_due_date": updated_user.next_kyc_due_date
    }
