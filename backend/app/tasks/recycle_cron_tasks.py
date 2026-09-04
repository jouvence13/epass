import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, and_

from app.tasks.celery_app import celery_app
from app.core.database import get_sync_session
from app.models.ticket_model import Tickets, TicketStatusEnum
from app.models.user_model import Users
from app.models.notification_model import Notifications

logger = logging.getLogger(__name__)


def _notify_users_in_window(db_session, window_start, window_end, message_template, channel="SMS"):
    """Find tickets expiring in window and queue notifications."""
    tickets = db_session.query(Tickets).filter(
        Tickets.status == TicketStatusEnum.ISSUED,
        Tickets.final_expiration_date >= window_start,
        Tickets.final_expiration_date <= window_end
    ).all()

    for t in tickets:
        user = db_session.query(Users).filter(Users.user_id == t.user_id).first()
        if user:
            # Check if notification was already recorded recently
            existing = db_session.query(Notifications).filter(
                Notifications.user_id == user.user_id,
                Notifications.ticket_id == t.ticket_id,
                Notifications.message == message_template
            ).first()
            if not existing:
                notif = Notifications(
                    user_id=user.user_id,
                    ticket_id=t.ticket_id,
                    title="Alerte Expiration Pass UAC",
                    message=message_template,
                    channel=channel,
                    is_sent=True,
                    scheduled_for=datetime.now(timezone.utc),
                    sent_at=datetime.now(timezone.utc)
                )
                db_session.add(notif)
                logger.info(f"[CRON NOTIF -> {user.phone_number}] {message_template}")
    db_session.commit()


@celery_app.task(name="app.tasks.recycle_cron_tasks.process_expiring_tickets_cascade")
def process_expiring_tickets_cascade():
    """
    Celery task: Cascade alert reminders (J-3, J-2, J-1, H-1) for ticket expiration.
    """
    db_session = get_sync_session()
    try:
        now = datetime.now(timezone.utc)
        margin = timedelta(minutes=10)

        # 1. J-3 (3 days before expiration)
        target_j3 = now + timedelta(days=3)
        _notify_users_in_window(
            db_session,
            target_j3 - margin,
            target_j3 + margin,
            "Rappel : Votre ticket UAC-BusPass expire dans 3 jours. Pensez à le recycler."
        )

        # 2. J-2 (2 days before expiration)
        target_j2 = now + timedelta(days=2)
        _notify_users_in_window(
            db_session,
            target_j2 - margin,
            target_j2 + margin,
            "Attention : Il ne vous reste que 2 jours pour utiliser ou recycler votre ticket."
        )

        # 3. J-1 (24 hours before expiration)
        target_j1 = now + timedelta(days=1)
        _notify_users_in_window(
            db_session,
            target_j1 - margin,
            target_j1 + margin,
            "Urgence : Votre ticket UAC-BusPass expire aujourd'hui. Dernier jour pour le recycler."
        )

        # 4. H-1 (1 hour before expiration)
        target_h1 = now + timedelta(hours=1)
        _notify_users_in_window(
            db_session,
            target_h1 - margin,
            target_h1 + margin,
            "Alerte Finale : Votre ticket expire dans 1 heure et sera définitivement supprimé."
        )

    except Exception as e:
        logger.error(f"Error processing expiring tickets cascade: {e}")
        db_session.rollback()
    finally:
        db_session.close()


@celery_app.task(name="app.tasks.recycle_cron_tasks.purge_unrecycled_tickets")
def purge_unrecycled_tickets():
    """
    Celery task: Automatically expire tickets that reached final expiration date (J+7) without validation.
    """
    db_session = get_sync_session()
    try:
        now = datetime.now(timezone.utc)
        expired_tickets = db_session.query(Tickets).filter(
            Tickets.status == TicketStatusEnum.ISSUED,
            Tickets.final_expiration_date < now
        ).all()

        for t in expired_tickets:
            t.status = TicketStatusEnum.EXPIRED
            logger.info(f"Purged expired ticket: {t.ticket_id}")

        db_session.commit()
    except Exception as e:
        logger.error(f"Error purging expired tickets: {e}")
        db_session.rollback()
    finally:
        db_session.close()
