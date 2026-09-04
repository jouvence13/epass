import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.database import get_async_db
from app.models.user_model import Users
from app.models.notification_model import Notifications
from app.services.auth_service import get_current_authenticated_user

router = APIRouter(prefix="/notifications", tags=["Notifications & Alerts"])


class NotificationOutSchema(BaseModel):
    id: str
    category: str
    title: str
    message: str
    time: str
    read: bool
    icon: str
    tone: str


@router.get("/my-notifications", response_model=List[NotificationOutSchema])
async def get_my_notifications(
    current_user: Users = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Returns user notifications from PostgreSQL database.
    If no notifications exist for a newly registered user, creates initial onboarding notifications.
    """
    query = (
        select(Notifications)
        .where(Notifications.user_id == current_user.user_id)
        .order_by(Notifications.created_at.desc())
    )
    result = await db.execute(query)
    notifs = result.scalars().all()

    # Si l'utilisateur est nouvellement inscrit et n'a pas encore de notifications
    if not notifs:
        init_notifs = [
            Notifications(
                user_id=current_user.user_id,
                title="Vérification Académique Requise",
                message=f"Bienvenue {current_user.first_name} ! Veuillez téléverser votre Carte d’Étudiant UAC et votre CIP pour débloquer les billets subventionnés à 100 FCFA.",
                is_sent=False
            ),
            Notifications(
                user_id=current_user.user_id,
                title="Portefeuille Universitaire Activé",
                message="Votre compte étudiant est initialisé. Vous pouvez enregistrer vos numéros MTN, Moov ou Celtiis pour recharger votre solde en 1 clic.",
                is_sent=False
            ),
            Notifications(
                user_id=current_user.user_id,
                title="Réseau Bus CROUS Actif",
                message="Navettes Campus Calavi ↔ Cotonou & Porto-Novo en circulation normale. Départs réguliers assurés.",
                is_sent=True
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
        # Determine category & icon from title / message
        text = f"{n.title} {n.message}".lower()
        if "kyc" in text or "dossier" in text:
            cat = "KYC"
            icon = "verified"
            tone = "success" if "validé" in text or "approuvé" in text else "warning"
        elif "trafic" in text or "retard" in text or "bus" in text:
            cat = "TRAFFIC"
            icon = "directions-bus" if "fluide" in text else "warning"
            tone = "info" if "fluide" in text else "warning"
        elif "paiement" in text or "achat" in text or "recharge" in text:
            cat = "PAYMENT"
            icon = "receipt"
            tone = "success"
        else:
            cat = "SCHEDULE"
            icon = "schedule"
            tone = "neutral"

        # Calculate time label
        delta = now - n.created_at
        if delta.total_seconds() < 3600:
            time_str = f"Il y a {max(1, int(delta.total_seconds() // 60))} min"
        elif delta.total_seconds() < 86400:
            time_str = f"Il y a {int(delta.total_seconds() // 3600)}h"
        else:
            time_str = n.created_at.strftime("%d/%m, %H:%M")

        items.append(
            NotificationOutSchema(
                id=str(n.notification_id),
                category=cat,
                title=n.title,
                message=n.message,
                time=time_str,
                read=n.is_sent,
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
    await db.execute(
        update(Notifications)
        .where(Notifications.user_id == current_user.user_id)
        .values(is_sent=True, sent_at=datetime.now(timezone.utc))
    )
    await db.commit()
    return {"message": "Toutes les notifications ont été marquées comme lues."}


class CreateNotificationSchema(BaseModel):
    title: str
    message: str
    category: Optional[str] = "GENERAL"
    tone: Optional[str] = "info"


@router.post("/create", response_model=NotificationOutSchema)
async def create_user_notification(
    payload: CreateNotificationSchema,
    current_user: Users = Depends(get_current_authenticated_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Creates and persists a notification for the current user in PostgreSQL.
    """
    notif = Notifications(
        user_id=current_user.user_id,
        title=payload.title,
        message=payload.message,
        is_sent=False
    )
    db.add(notif)
    await db.commit()
    await db.refresh(notif)

    return NotificationOutSchema(
        id=str(notif.notification_id),
        category=payload.category or "GENERAL",
        title=notif.title,
        message=notif.message,
        time="À l'instant",
        read=False,
        icon="notifications-active",
        tone=payload.tone or "info"
    )
