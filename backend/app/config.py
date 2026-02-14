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

    class Config:
        env_file = ".env"


settings = Settings()
