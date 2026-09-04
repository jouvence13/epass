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


async def submit_driver_kyc(
    user: Users,
    driver_license_file: UploadFile,
    medical_cert_file: UploadFile,
    identity_file: UploadFile,
    db: AsyncSession
) -> List[KycDocuments]:
    """Store submitted Driver KYC documents (Permis D, Certificat Médical, CIP) and update status to PENDING."""
    license_url = await save_kyc_file_to_storage(driver_license_file)
    medical_url = await save_kyc_file_to_storage(medical_cert_file)
    identity_url = await save_kyc_file_to_storage(identity_file)

    doc_license = KycDocuments(
        user_id=user.user_id,
        document_type=DocumentTypeEnum.DRIVER_LICENSE,
        document_url=license_url,
        verification_status=KycStatusEnum.PENDING,
        academic_year="2025-2026"
    )
    doc_medical = KycDocuments(
        user_id=user.user_id,
        document_type=DocumentTypeEnum.MEDICAL_CERTIFICATE,
        document_url=medical_url,
        verification_status=KycStatusEnum.PENDING,
        academic_year="2025-2026"
    )
    doc_identity = KycDocuments(
        user_id=user.user_id,
        document_type=DocumentTypeEnum.CIP_IDENTITY,
        document_url=identity_url,
        verification_status=KycStatusEnum.PENDING,
        academic_year="2025-2026"
    )

    db.add_all([doc_license, doc_medical, doc_identity])
    user.kyc_status = KycStatusEnum.PENDING
    await db.commit()
    await db.refresh(user)

    from app.services.notification_service import notification_service
    await notification_service.create_user_notification(
        db=db,
        user_id=user.user_id,
        title="Dossier Chauffeur Soumis",
        message="Vos pièces (Permis D, Certificat Médical, CIP) ont été transmises. Examen en cours par l'administration CROUS.",
        category="KYC",
        tone="info",
        channel="PUSH",
        is_sent=True
    )

    return [doc_license, doc_medical, doc_identity]


async def submit_controller_kyc(
    user: Users,
    controller_badge_file: UploadFile,
    identity_file: UploadFile,
    db: AsyncSession
) -> List[KycDocuments]:
    """Store submitted Controller KYC documents (Badge CROUS, CIP) and update status to PENDING."""
    badge_url = await save_kyc_file_to_storage(controller_badge_file)
    identity_url = await save_kyc_file_to_storage(identity_file)

    doc_badge = KycDocuments(
        user_id=user.user_id,
        document_type=DocumentTypeEnum.CONTROLLER_BADGE,
        document_url=badge_url,
        verification_status=KycStatusEnum.PENDING,
        academic_year="2025-2026"
    )
    doc_identity = KycDocuments(
        user_id=user.user_id,
        document_type=DocumentTypeEnum.CIP_IDENTITY,
        document_url=identity_url,
        verification_status=KycStatusEnum.PENDING,
        academic_year="2025-2026"
    )

    db.add_all([doc_badge, doc_identity])
    user.kyc_status = KycStatusEnum.PENDING
    await db.commit()
    await db.refresh(user)

    from app.services.notification_service import notification_service
    await notification_service.create_user_notification(
        db=db,
        user_id=user.user_id,
        title="Dossier Contrôleur Soumis",
        message="Votre accréditation d'agent et votre CIP ont été transmis. Examen en cours par l'administration CROUS.",
        category="KYC",
        tone="info",
        channel="PUSH",
        is_sent=True
    )

    return [doc_badge, doc_identity]


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

    # Enregistrement persistant de la notification de décision administrative en base de données
    from app.services.notification_service import notification_service
    if action == KycStatusEnum.APPROVED:
        await notification_service.create_user_notification(
            db=db,
            user_id=user.user_id,
            title="Dossier KYC Validé",
            message="Félicitations ! Vos pièces justificatives ont été vérifiées par le CROUS. Vous bénéficiez du tarif subventionné à 100 FCFA.",
            category="KYC",
            tone="success",
            channel="PUSH",
            is_sent=True
        )
    elif action == KycStatusEnum.REJECTED:
        reason_text = f" Motif : {rejection_reason}" if rejection_reason else ""
        await notification_service.create_user_notification(
            db=db,
            user_id=user.user_id,
            title="Dossier KYC Rejeté",
            message=f"Votre dossier a été refusé.{reason_text} Veuillez soumettre à nouveau des pièces lisibles.",
            category="KYC",
            tone="warning",
            channel="PUSH",
            is_sent=True
        )

    return user
