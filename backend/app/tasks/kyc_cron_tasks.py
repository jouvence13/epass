import logging
from datetime import datetime, timezone

from app.tasks.celery_app import celery_app
from app.core.database import get_sync_session
from app.models.user_model import Users, UserRoleEnum, KycStatusEnum

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.kyc_cron_tasks.suspend_non_compliant_accounts")
def suspend_non_compliant_accounts():
    """
    Celery task: Daily audit (01:00 AM) to identify student accounts whose 90-day
    KYC verification validity has elapsed without renewed validation.
    """
    db_session = get_sync_session()
    try:
        critical_date = datetime.now(timezone.utc)
        
        expired_accounts = db_session.query(Users).filter(
            Users.role == UserRoleEnum.STUDENT,
            Users.is_active == True,
            Users.next_kyc_due_date <= critical_date
        ).all()

        for user in expired_accounts:
            user.kyc_status = KycStatusEnum.EXPIRED
            logger.info(
                f"[KYC AUDIT 90j -> User {user.user_id}] Compte marqué EXPIRED (délai dépassé: {user.next_kyc_due_date})"
            )

        db_session.commit()
    except Exception as e:
        logger.error(f"Error during KYC compliance audit: {e}")
        db_session.rollback()
    finally:
        db_session.close()
