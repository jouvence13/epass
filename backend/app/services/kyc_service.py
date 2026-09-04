import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Tuple
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.models.user_model import Users, KycDocuments, KycStatusEnum, DocumentTypeEnum


async def save_kyc_file_to_storage(file: UploadFile) -> str:
    """Save an uploaded KYC document file to local storage or cloud bucket."""
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    file_extension = os.path.splitext(file.filename or "")[1] or ".jpg"
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
        
    return file_path


async def submit_user_kyc(
    user: Users,
    student_card_file: UploadFile,
    identity_file: UploadFile,
    academic_year: str,
    db: AsyncSession
) -> Tuple[KycDocuments, KycDocuments]:
    """Store submitted KYC documents and update user status to PENDING."""
    student_card_url = await save_kyc_file_to_storage(student_card_file)
    identity_url = await save_kyc_file_to_storage(identity_file)

    doc_student = KycDocuments(
        user_id=user.user_id,
        document_type=DocumentTypeEnum.STUDENT_CARD,
        document_url=student_card_url,
        verification_status=KycStatusEnum.PENDING,
        academic_year=academic_year
    )
    
    doc_identity = KycDocuments(
        user_id=user.user_id,
        document_type=DocumentTypeEnum.CIP_IDENTITY,
        document_url=identity_url,
        verification_status=KycStatusEnum.PENDING,
        academic_year=academic_year
    )

    db.add_all([doc_student, doc_identity])
    user.kyc_status = KycStatusEnum.PENDING
    await db.commit()
    await db.refresh(user)
    
    return doc_student, doc_identity


async def moderate_kyc(
    target_user_id: uuid.UUID,
    moderator: Users,
    action: KycStatusEnum,
    rejection_reason: str,
    db: AsyncSession
) -> Users:
    """Validate or reject a user KYC submission."""
    user = await db.get(Users, target_user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur introuvable."
        )

    now = datetime.now(timezone.utc)
    if action == KycStatusEnum.APPROVED:
        user.kyc_status = KycStatusEnum.APPROVED
        user.last_kyc_verification_date = now
        user.next_kyc_due_date = now + timedelta(days=90) # 90-day renewal cycle
        user.is_active = True
    elif action == KycStatusEnum.REJECTED:
        user.kyc_status = KycStatusEnum.REJECTED

    # Update docs
    docs_result = await db.execute(
        select(KycDocuments).where(KycDocuments.user_id == target_user_id)
    )
    docs = docs_result.scalars().all()
    for doc in docs:
        doc.verification_status = action
        doc.validated_by = moderator.user_id
        doc.validated_at = now
        if action == KycStatusEnum.REJECTED:
            doc.rejection_reason = rejection_reason

    await db.commit()
    await db.refresh(user)
    return user
