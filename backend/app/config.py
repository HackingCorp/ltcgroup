import os
import secrets
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    database_url: str = "postgresql+asyncpg://ltcgroup:ltcgroup_secret@localhost:5432/ltcgroup"
    redis_url: str = "redis://localhost:6379/0"
    environment: str = "development"

    # Swychr / AccountPE Virtual Card API
    accountpe_api_url: str = "https://api.accountpe.com/api/card/sandbox"
    swychr_email: str = ""
    swychr_password: str = ""

    jwt_secret_key: str = ""
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_minutes: int = 10080  # 7 days

    encryption_key: str = ""

    # Database pool settings (4 workers x 10 conns = 40 max, well under PG 100 limit)
    db_pool_size: int = 5
    db_max_overflow: int = 5
    db_pool_timeout: int = 30
    db_pool_recycle: int = 1800

    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:8000"]

    # Payin API Configuration (reuses swychr_email/swychr_password for auth)
    payin_api_url: str = "https://api.accountpe.com/api/payin"
    payin_webhook_url: str = ""  # Callback URL for Payin webhooks

    # E-nkap Payment Configuration
    enkap_api_url: str = "https://api-v2.enkap.cm"
    enkap_consumer_key: str = ""
    enkap_consumer_secret: str = ""
    enkap_merchant_code: str = ""  # Optional merchant code if needed
    enkap_webhook_secret: str = ""  # Dedicated secret for E-nkap webhook signature verification

    # Payout API Configuration (reuses swychr_email/swychr_password for auth)
    payout_api_url: str = "https://api.accountpe.com/api/payout"

    # Payin Webhook Secret (separate from OAuth credentials)
    payin_webhook_secret: str = ""

    # SMTP Email Configuration
    smtp_host: str = "mail.ltcgroup.site"
    smtp_port: int = 587
    smtp_user: str = "noreply@ltcgroup.site"
    smtp_password: str = ""
    smtp_from_email: str = "noreply@ltcgroup.site"

    # Fee Rates (configurable without code deploy)
    card_operation_fee_rate: float = 0.015   # 1.5% on card topup/withdraw
    wallet_topup_fee_rate: float = 0.005     # 0.5% on wallet topup (e-nkap)
    wallet_transfer_fee_rate: float = 0.02   # 2% for wallet→card (USD only)

    # Card tier prices (USD)
    card_tier_standard_price: float = 5.0
    card_tier_premium_price: float = 10.0
    card_tier_gold_price: float = 15.0

    # File Upload Configuration
    upload_dir: str = "./uploads"

    # KYC Verifier microservice
    kyc_verifier_url: str = "http://kyc-verifier:8001"
    kyc_verifier_api_key: str = ""
    kyc_auto_approve_threshold: float = 0.85
    kyc_manual_review_threshold: float = 0.50

    # Firebase Cloud Messaging (FCM) push notifications
    firebase_credentials_path: str = ""  # Path to Firebase service account JSON

    # S3 Configuration (optional, for production)
    aws_s3_bucket: str = ""
    aws_s3_region: str = ""
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""

    @model_validator(mode="after")
    def validate_secrets(self) -> "Settings":
        if self.environment != "development":
            if not self.jwt_secret_key:
                raise ValueError(
                    "JWT_SECRET_KEY must be set in production. "
                    "Generate with: python -c \"import secrets; print(secrets.token_hex(32))\""
                )
            if not self.encryption_key:
                raise ValueError("encryption_key must be set in non-development environments")
            if not self.payin_webhook_secret:
                raise ValueError("payin_webhook_secret must be set in non-development environments")
            if not self.enkap_webhook_secret:
                raise ValueError("enkap_webhook_secret must be set in non-development environments")
        else:
            # In development, generate a random secret per process start
            # (no hardcoded fallback to avoid accidental production use)
            if not self.jwt_secret_key:
                self.jwt_secret_key = secrets.token_hex(32)
            if not self.encryption_key:
                self.encryption_key = "dev-encryption-key-stable-do-not-use-in-production"
        return self


settings = Settings()
