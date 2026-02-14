from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://ltcgroup:ltcgroup_secret@localhost:5432/ltcgroup"
    redis_url: str = "redis://localhost:6379/0"
    environment: str = "development"

    accountpe_api_url: str = "https://api.accountpe.com/v2"
    accountpe_api_key: str = ""
    accountpe_jwt_secret: str = ""

    jwt_secret_key: str = "your-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    encryption_key: str = "your-encryption-key-change-in-production"

    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:8000"]

    # S3P (Smobilpay) Payment Configuration
    s3p_api_url: str = "https://s3pv2cm.smobilpay.com/v2"
    s3p_api_key: str = "9183eee1-bf8b-49cb-bffc-d466706d3aef"
    s3p_api_secret: str = "c5821829-a9db-4cf1-9894-65e3caffaa62"
    s3p_merchant_id: str = ""  # Optional merchant ID if needed

    # E-nkap Payment Configuration
    enkap_api_url: str = "https://api-v2.enkap.cm"
    enkap_consumer_key: str = "wXRF_8iU7h9UNiBG4zNYFdCQPwga"
    enkap_consumer_secret: str = "rD9fRGJkVVs8TZtfjJ0VTD7taOsa"
    enkap_merchant_code: str = ""  # Optional merchant code if needed

    # SMTP Email Configuration
    smtp_host: str = "mail.ltcgroup.site"
    smtp_port: int = 587
    smtp_user: str = "noreply@ltcgroup.site"
    smtp_password: str = ""
    smtp_from_email: str = "noreply@ltcgroup.site"

    # File Upload Configuration
    upload_dir: str = "./uploads"

    # S3 Configuration (optional, for production)
    aws_s3_bucket: str = ""
    aws_s3_region: str = ""
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
