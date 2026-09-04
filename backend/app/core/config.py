import os
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyHttpUrl, field_validator


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "UAC-BusPass API"
    APP_ENV: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://localhost:19006",
        "exp://localhost:8081",
        "*"
    ]

    # Security & JWT
    SECRET_KEY: str = "uac_buspass_secret_key_development_random_hash_key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440 # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    QR_ENCRYPTION_KEY: str = "uac_buspass_aes_256_secret_key_32_bytes!" # 32 bytes for AES-256

    # Database PostgreSQL + PostGIS
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "uac_buspass_user"
    POSTGRES_PASSWORD: str = "uac_buspass_password"
    POSTGRES_DB: str = "uac_buspass_db"
    DATABASE_URL: str = "postgresql+asyncpg://uac_buspass_user:uac_buspass_password@localhost:5432/uac_buspass_db"
    SYNC_DATABASE_URL: str = "postgresql://uac_buspass_user:uac_buspass_password@localhost:5432/uac_buspass_db"

    # Redis & Celery
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

    # Payment Gateways (FedaPay & KkiaPay)
    FEDAPAY_SECRET_KEY: str = "fp_sandbox_sample_key"
    FEDAPAY_PUBLIC_KEY: str = "fp_sandbox_public_key"
    FEDAPAY_ENVIRONMENT: str = "sandbox"

    KKIAPAY_PUBLIC_KEY: str = "kkiapay_sample_public"
    KKIAPAY_PRIVATE_KEY: str = "kkiapay_sample_private"
    KKIAPAY_SECRET: str = "kkiapay_sample_secret"
    KKIAPAY_SANDBOX: bool = True

    # Storage & Uploads
    UPLOAD_DIR: str = "./uploads/kyc"

    # Notifications
    FIREBASE_CREDENTIALS_PATH: str = "./firebase_credentials.json"
    SMS_GATEWAY_API_KEY: str = "mock_sms_gateway_key"
    SMS_SENDER_ID: str = "UAC-BusPass"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow"
    )


settings = Settings()
