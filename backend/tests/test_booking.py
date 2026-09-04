import pytest
import uuid
from app.core.security import hash_password, verify_password, generate_encrypted_qr_payload, decrypt_qr_payload
from app.services.ticket_engine_service import generate_secure_sms_otp


def test_password_hashing():
    pwd = "StudentSecret123"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_dual_format_pass_generation():
    ticket_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    trip_id = str(uuid.uuid4())

    # 1. Optical AES QR Code token
    encrypted_token = generate_encrypted_qr_payload(ticket_id, user_id, trip_id)
    assert isinstance(encrypted_token, str)
    assert len(encrypted_token) > 0

    decrypted = decrypt_qr_payload(encrypted_token)
    assert decrypted["ticket_id"] == ticket_id
    assert decrypted["user_id"] == user_id
    assert decrypted["trip_id"] == trip_id

    # 2. SMS Backup OTP
    sms_otp = generate_secure_sms_otp(6)
    assert len(sms_otp) == 6
    assert sms_otp.isalnum()
    assert sms_otp.isupper()
