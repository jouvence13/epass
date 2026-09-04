from datetime import datetime, timedelta, timezone


def test_recycling_deadline_rule():
    departure_time = datetime.now(timezone.utc)
    final_expiration_date = departure_time + timedelta(days=7)

    # Within deadline
    valid_attempt = departure_time + timedelta(days=5)
    assert valid_attempt <= final_expiration_date

    # Expired past J+7
    expired_attempt = departure_time + timedelta(days=7, hours=1)
    assert expired_attempt > final_expiration_date
