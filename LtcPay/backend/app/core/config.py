import secrets
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Application
    APP_NAME: str = "LtcPay"
    APP_VERSION: str = "1.0.0"

    # Database
    database_url: str = "postgresql+asyncpg://ltcpay:ltcpay_secret@localhost:5432/ltcpay"
    redis_url: str = "redis://localhost:6379/1"
    environment: str = "development"

    # Monitoring
    sentry_dsn: str = ""  # Set to enable Sentry error tracking

    # JWT / Secret key for signing tokens
    SECRET_KEY: str = ""
    jwt_secret_key: str = ""
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Database pool settings
    db_pool_size: int = 5
    db_max_overflow: int = 5
    db_pool_timeout: int = 30
    db_pool_recycle: int = 1800

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:8000,http://localhost:8001"

    # TouchPay Configuration
    # SDK reference: sendPaymentInfos(payment_token, merchant_id, secure_code,
    #   merchant_website, success_url, failed_url, amount, city, email,
    #   first_name, last_name, phone)
    TOUCHPAY_MERCHANT_ID: str = "LTCGR11789"
    TOUCHPAY_SECURE_CODE: str = ""
    TOUCHPAY_MERCHANT_WEBSITE: str = "ltcpay.com"
    TOUCHPAY_SECRET: str = ""
    TOUCHPAY_SDK_URL: str = "https://touchpay.gutouch.net/touchpayv2/script/prod_touchpay-0.0.2.js"
    TOUCHPAY_CALLBACK_URL: str = ""
    TOUCHPAY_RETURN_URL: str = ""

    # Legacy aliases (used by some modules)
    touchpay_api_url: str = "https://touchpay.gutouch.net/touchpayv2/api"
    touchpay_api_key: str = ""
    touchpay_api_secret: str = ""
    touchpay_merchant_id: str = "LTCGR11789"
    touchpay_webhook_secret: str = ""
    touchpay_sdk_url: str = "https://touchpay.gutouch.net/touchpayv2/script/prod_touchpay-0.0.2.js"

    # Payment gateway settings
    PAYMENT_CURRENCY: str = "XAF"
    MIN_PAYMENT_AMOUNT: float = 100.0
    MAX_PAYMENT_AMOUNT: float = 10000000.0
    payment_link_expiry_minutes: int = 30
    default_currency: str = "XAF"

    # Base URL (public-facing URL of this service)
    base_url: str = "http://localhost:8001"
    webhook_base_url: str = "http://localhost:8001"

    # Merchant notification settings
    merchant_webhook_timeout: int = 30
    merchant_webhook_max_retries: int = 5

    @model_validator(mode="after")
    def validate_secrets(self) -> "Settings":
        if self.environment != "development":
            if not self.jwt_secret_key:
                raise ValueError("JWT_SECRET_KEY must be set in production")
        else:
            if not self.jwt_secret_key:
                self.jwt_secret_key = secrets.token_hex(32)
            if not self.SECRET_KEY:
                self.SECRET_KEY = self.jwt_secret_key
        # Sync SECRET_KEY with jwt_secret_key if not set
        if not self.SECRET_KEY:
            self.SECRET_KEY = self.jwt_secret_key
        # Sync TouchPay uppercase/lowercase fields
        if self.touchpay_merchant_id and not self.TOUCHPAY_MERCHANT_ID:
            self.TOUCHPAY_MERCHANT_ID = self.touchpay_merchant_id
        if self.touchpay_webhook_secret and not self.TOUCHPAY_SECRET:
            self.TOUCHPAY_SECRET = self.touchpay_webhook_secret
        # Fallback: use TOUCHPAY_SECRET as secure_code if not set separately
        if not self.TOUCHPAY_SECURE_CODE and self.TOUCHPAY_SECRET:
            self.TOUCHPAY_SECURE_CODE = self.TOUCHPAY_SECRET
        return self


settings = Settings()
