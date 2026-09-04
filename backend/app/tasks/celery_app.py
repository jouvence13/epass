from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "uac_buspass_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.recycle_cron_tasks",
        "app.tasks.kyc_cron_tasks",
    ]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        # Check tickets expiring and send cascade alerts (J-3, J-2, J-1, H-1) every 10 minutes
        "check_expiring_tickets_every_10_min": {
            "task": "app.tasks.recycle_cron_tasks.process_expiring_tickets_cascade",
            "schedule": crontab(minute="*/10"),
        },
        # Purge un-recycled expired tickets past J+7 hourly
        "purge_expired_tickets_hourly": {
            "task": "app.tasks.recycle_cron_tasks.purge_unrecycled_tickets",
            "schedule": crontab(minute="0", hour="*"),
        },
        # Daily at 01:00 AM: Suspend student accounts with expired 90-day KYC
        "check_kyc_quarterly_compliance_daily": {
            "task": "app.tasks.kyc_cron_tasks.suspend_non_compliant_accounts",
            "schedule": crontab(hour="1", minute="0"),
        },
    }
)
