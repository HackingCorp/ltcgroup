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
    access_token_expire_minutes: int = 30

    encryption_key: str = ""

    # Database pool settings
    db_pool_size: int = 20
    db_max_overflow: int = 10
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

    # Payin Webhook Secret (separate from OAuth credentials)
    payin_webhook_secret: str = ""

    # SMTP Email Configuration
    smtp_host: str = "mail.ltcgroup.site"
    smtp_port: int = 587
    smtp_user: str = "noreply@ltcgroup.site"
    smtp_password: str = ""
    smtp_from_email: str = "noreply@ltcgroup.site"

    # File Upload Configuration
    upload_dir: str = "./uploads"

    # KYC Verifier microservice
    kyc_verifier_url: str = "http://kyc-verifier:8001"
    kyc_verifier_api_key: str = ""
    kyc_auto_approve_threshold: float = 0.85
    kyc_manual_review_threshold: float = 0.50

    # S3 Configuration (optional, for production)
    aws_s3_bucket: str = ""
    aws_s3_region: str = ""
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""

    @model_validator(mode="after")
    def validate_secrets(self) -> "Settings":
        if self.environment != "development":
            if not self.jwt_secret_key:
                raise ValueError("jwt_secret_key must be set in non-development environments")
            if not self.encryption_key:
                raise ValueError("encryption_key must be set in non-development environments")
        else:
            if not self.jwt_secret_key:
                self.jwt_secret_key = "dev-jwt-secret-" + secrets.token_hex(16)
            if not self.encryption_key:
                self.encryption_key = "dev-encryption-key-" + secrets.token_hex(16)
        return self


settings = Settings()
