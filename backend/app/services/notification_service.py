import logging
from typing import Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


class NotificationService:
    """Service to handle Push Notifications (FCM) & SMS (local Bénin Gateway / Twilio)."""

    @staticmethod
    async def send_sms(phone_number: str, message: str) -> bool:
        """Send SMS notification to recipient phone number."""
        logger.info(f"[SMS -> {phone_number}] {message}")
        # In production, call SMS Provider API (Twilio, Infobip, local gateway)
        return True

    @staticmethod
    async def send_push_notification(user_id: str, title: str, body: str, data: Optional[dict] = None) -> bool:
        """Send Push notification via Firebase Cloud Messaging."""
        logger.info(f"[PUSH -> User:{user_id}] Title: {title} | Body: {body}")
        # In production, call firebase_admin.messaging.send()
        return True


notification_service = NotificationService()
