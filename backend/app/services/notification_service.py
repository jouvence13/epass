import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.notification_model import Notifications
from app.schemas.notification_schema import NotificationOutSchema

logger = logging.getLogger(__name__)


class NotificationService:
    """Service to handle Push Notifications (FCM), SMS & database persistence."""

    @staticmethod
    async def send_sms(phone_number: str, message: str) -> bool:
        """Send SMS notification to recipient phone number."""
        logger.info(f"[SMS -> {phone_number}] {message}")
        return True

    @staticmethod
    async def send_push_notification(user_id: str, title: str, body: str, data: Optional[dict] = None) -> bool:
        """Send Push notification via Firebase Cloud Messaging."""
        logger.info(f"[PUSH -> User:{user_id}] Title: {title} | Body: {body}")
        return True

    @staticmethod
    async def create_user_notification(
        db: AsyncSession,
        user_id: uuid.UUID,
        title: str,
        message: str,
        category: str = "GENERAL",
        tone: str = "info",
        channel: str = "PUSH",
        is_sent: bool = True
    ) -> Notifications:
        """Create and persist a notification for a user."""
        notif = Notifications(
            user_id=user_id,
            title=title,
            message=message,
            category=category,
            tone=tone,
            channel=channel,
            is_sent=is_sent,
            read=False,
            scheduled_for=datetime.now(timezone.utc),
            sent_at=datetime.now(timezone.utc) if is_sent else None
        )
        db.add(notif)
        await db.commit()
        await db.refresh(notif)
        return notif

    @staticmethod
    async def get_user_notifications(
        db: AsyncSession,
        user_id: uuid.UUID,
        limit: int = 50
    ) -> List[Notifications]:
        """Fetch all notifications for a given user ordered by creation date."""
        query = (
            select(Notifications)
            .where(Notifications.user_id == user_id)
            .order_by(Notifications.created_at.desc())
            .limit(limit)
        )
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def mark_notifications_as_read(
        db: AsyncSession,
        user_id: uuid.UUID,
        notification_id: Optional[uuid.UUID] = None
    ) -> int:
        """Mark one or all notifications as read for a user."""
        if notification_id:
            stmt = (
                update(Notifications)
                .where(Notifications.user_id == user_id, Notifications.notification_id == notification_id)
                .values(read=True, is_sent=True)
            )
        else:
            stmt = (
                update(Notifications)
                .where(Notifications.user_id == user_id)
                .values(read=True, is_sent=True)
            )
        res = await db.execute(stmt)
        await db.commit()
        return res.rowcount


notification_service = NotificationService()
