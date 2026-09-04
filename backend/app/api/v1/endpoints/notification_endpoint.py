import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.database import get_async_db
from app.models.user_model import Users
from app.models.notification_model import Notifications
from app.schemas.notification_schema import (
    NotificationOutSchema,
    CreateNotificationRequestSchema,
    MarkNotificationReadRequestSchema,
)
from app.services.auth_service import get_current_authenticated_user
from app.services.notification_service import notification_service

router = APIRouter(prefix="/notifications", tags=["Notifications & Alerts"])


@router.get("/my-notifications", response_model=List[NotificationOutSchema])
async def get_my_notifications(
    current_user: Users = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Returns user notifications from PostgreSQL database.
    If no notifications exist for a newly registered user, creates initial onboarding notifications.
    """
    notifs = await notification_service.get_user_notifications(db, current_user.user_id)

    # Si l'utilisateur est nouvellement inscrit et n'a pas encore de notifications
    if not notifs:
        init_notifs = [
            Notifications(
                user_id=current_user.user_id,
                title="Vérification Académique Requise",
                message=f"Bienvenue {current_user.first_name} ! Veuillez téléverser votre Carte d’Étudiant UAC et votre CIP pour débloquer les billets subventionnés à 100 FCFA.",
                category="KYC",
                tone="warning",
                is_sent=False,
                read=False,
            ),
            Notifications(
                user_id=current_user.user_id,
                title="Portefeuille Universitaire Activé",
                message="Votre compte étudiant est initialisé. Vous pouvez enregistrer vos numéros MTN, Moov ou Celtiis pour recharger votre solde en 1 clic.",
                category="WALLET",
                tone="info",
                is_sent=False,
                read=False,
            ),
            Notifications(
                user_id=current_user.user_id,
                title="Réseau Bus CROUS Actif",
                message="Navettes Campus Calavi ↔ Cotonou & Porto-Novo en circulation normale. Départs réguliers assurés.",
                category="TRAFFIC",
                tone="success",
                is_sent=True,
                read=False,
            ),
        ]
        db.add_all(init_notifs)
        await db.commit()
        for n in init_notifs:
            await db.refresh(n)
        notifs = init_notifs

    items = []
    now = datetime.now(timezone.utc)

    for n in notifs:
        # Determine category & icon from title / message / stored category
        cat = getattr(n, "category", "GENERAL") or "GENERAL"
        tone = getattr(n, "tone", "info") or "info"
        text = f"{n.title} {n.message}".lower()

        if cat == "KYC" or "kyc" in text or "dossier" in text:
            cat = "KYC"
            icon = "verified"
            tone = "success" if "validé" in text or "approuvé" in text else "warning"
        elif cat == "TRAFFIC" or "trafic" in text or "retard" in text or "bus" in text:
            cat = "TRAFFIC"
            icon = "directions-bus" if "fluide" in text else "warning"
            tone = "info" if "fluide" in text else "warning"
        elif cat in ("PAYMENT", "WALLET") or "paiement" in text or "achat" in text or "recharge" in text:
            cat = "PAYMENT"
            icon = "receipt"
            tone = "success"
        else:
            cat = "GENERAL"
            icon = "notifications"
            tone = "info"

        # Calculate time label
        created_time = n.created_at if n.created_at else now
        if created_time.tzinfo is None:
            created_time = created_time.replace(tzinfo=timezone.utc)
        delta = now - created_time
        if delta.total_seconds() < 3600:
            time_str = f"Il y a {max(1, int(delta.total_seconds() // 60))} min"
        elif delta.total_seconds() < 86400:
            time_str = f"Il y a {int(delta.total_seconds() // 3600)}h"
        else:
            time_str = created_time.strftime("%d/%m, %H:%M")

        items.append(
            NotificationOutSchema(
                id=str(n.notification_id),
                category=cat,
                title=n.title,
                message=n.message,
                time=time_str,
                read=bool(getattr(n, "read", False) or n.is_sent),
                icon=icon,
                tone=tone
            )
        )

    return items


@router.post("/mark-all-read")
async def mark_all_notifications_read(
    current_user: Users = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Marks all notifications for the current user as read in PostgreSQL.
    """
    await notification_service.mark_notifications_as_read(db, current_user.user_id)
    return {"message": "Toutes les notifications ont été marquées comme lues."}


@router.post("/create", response_model=NotificationOutSchema)
async def create_user_notification(
    payload: CreateNotificationRequestSchema,
    current_user: Users = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Creates and persists a notification for the current user in PostgreSQL.
    """
    notif = await notification_service.create_user_notification(
        db=db,
        user_id=current_user.user_id,
        title=payload.title,
        message=payload.message,
        category=payload.category or "GENERAL",
        tone=payload.tone or "info",
        channel=payload.channel or "PUSH",
        is_sent=True
    )

    return NotificationOutSchema(
        id=str(notif.notification_id),
        category=notif.category or "GENERAL",
        title=notif.title,
        message=notif.message,
        time="À l'instant",
        read=False,
        icon="notifications-active",
        tone=notif.tone or "info"
    )
