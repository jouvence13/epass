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
from app.services.kyc_service import submit_driver_kyc, submit_controller_kyc, moderate_kyc

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
    await submit_driver_kyc(
        user=current_user,
        driver_license_file=student_card_file,
        medical_cert_file=student_card_file,
        identity_file=identity_file,
        db=db
    ) if current_user.role == UserRoleEnum.DRIVER else None

    # For student
    from app.models.user_model import KycDocuments, DocumentTypeEnum
    from app.services.kyc_service import save_kyc_file_to_storage
    if current_user.role == UserRoleEnum.STUDENT:
        doc1_url = await save_kyc_file_to_storage(student_card_file)
        doc2_url = await save_kyc_file_to_storage(identity_file)
        doc_student = KycDocuments(
            user_id=current_user.user_id,
            document_type=DocumentTypeEnum.STUDENT_CARD,
            document_url=doc1_url,
            verification_status=KycStatusEnum.PENDING,
            academic_year=academic_year
        )
        doc_identity = KycDocuments(
            user_id=current_user.user_id,
            document_type=DocumentTypeEnum.CIP_IDENTITY,
            document_url=doc2_url,
            verification_status=KycStatusEnum.PENDING,
            academic_year=academic_year
        )
        db.add_all([doc_student, doc_identity])
        current_user.kyc_status = KycStatusEnum.PENDING
        await db.commit()
        await db.refresh(current_user)

    return KycSubmissionResponseSchema(
        message="Documents soumis avec succès. Validation sous 24h par l'administration universitaire.",
        kyc_status=current_user.kyc_status.value,
        submitted_at=datetime.now(timezone.utc)
    )


@router.post("/driver/upload", response_model=KycSubmissionResponseSchema)
async def upload_driver_documents(
    driver_license_file: UploadFile = File(..., description="Scan du Permis de Conduire (Permis D Transport en Commun)"),
    medical_cert_file: UploadFile = File(..., description="Certificat d'Aptitude Médicale"),
    identity_file: UploadFile = File(..., description="Certificat d'Identification Personnelle (CIP) ou CNI"),
    current_driver: Users = Depends(require_roles([UserRoleEnum.DRIVER, UserRoleEnum.SUPERADMIN])),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Driver: Submit professional documents (Permis D, Certificat Médical, CIP) for administrative validation.
    """
    await submit_driver_kyc(
        user=current_driver,
        driver_license_file=driver_license_file,
        medical_cert_file=medical_cert_file,
        identity_file=identity_file,
        db=db
    )
    return KycSubmissionResponseSchema(
        message="Dossier Chauffeur soumis avec succès. Validation administrative en cours.",
        kyc_status=current_driver.kyc_status.value,
        submitted_at=datetime.now(timezone.utc)
    )


@router.post("/controller/upload", response_model=KycSubmissionResponseSchema)
async def upload_controller_documents(
    controller_badge_file: UploadFile = File(..., description="Badge / Accréditation d'Agent"),
    identity_file: UploadFile = File(..., description="Certificat d'Identification Personnelle (CIP) ou CNI"),
    current_controller: Users = Depends(require_roles([UserRoleEnum.CONTROLLER, UserRoleEnum.SUPERADMIN])),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Controller: Submit staff accreditation (Badge, CIP) for administrative validation.
    """
    await submit_controller_kyc(
        user=current_controller,
        controller_badge_file=controller_badge_file,
        identity_file=identity_file,
        db=db
    )
    return KycSubmissionResponseSchema(
        message="Dossier Contrôleur soumis avec succès. Validation administrative en cours.",
        kyc_status=current_controller.kyc_status.value,
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
    """Admin: List all pending KYC document submissions with full user profile info."""
    query = await db.execute(
        select(KycDocuments, Users)
        .join(Users, KycDocuments.user_id == Users.user_id)
        .where(KycDocuments.verification_status == KycStatusEnum.PENDING)
        .order_by(KycDocuments.created_at.desc())
    )
    results = query.all()
    
    docs_out = []
    for doc, user in results:
        doc_url = doc.document_url
        if doc_url and ("uploads/" in doc_url or "uploads\\" in doc_url):
            filename = doc_url.replace("\\", "/").split("uploads/")[-1]
            doc_url = f"/uploads/{filename}"

        docs_out.append(
            KycDocumentOutSchema(
                document_id=doc.document_id,
                user_id=doc.user_id,
                document_type=doc.document_type,
                document_url=doc_url,
                verification_status=doc.verification_status,
                rejection_reason=doc.rejection_reason,
                academic_year=doc.academic_year,
                created_at=doc.created_at,
                user_full_name=f"{user.first_name} {user.last_name}".strip(),
                user_matricule=user.matricule_uac,
                user_phone=user.phone_number,
                user_role=user.role.value if hasattr(user.role, 'value') else str(user.role),
            )
        )
    return docs_out



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
