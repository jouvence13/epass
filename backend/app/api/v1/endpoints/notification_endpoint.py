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
    """
    query = (
        select(Notifications)
        .where(Notifications.user_id == current_user.user_id)
        .order_by(Notifications.created_at.desc())
    )
    result = await db.execute(query)
    notifs = result.scalars().all()

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
