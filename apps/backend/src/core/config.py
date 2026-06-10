from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_ENV: str = "development"
    APP_NAME: str = "Emotion Classification API"
    APP_VERSION: str = "1.0.0"

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/emotion_db"

    JWT_SECRET: str = "change_me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    AI_SERVICE_BASE_URL: str = "http://localhost:9000"
    AI_SERVICE_TIMEOUT_SECONDS: int = 10

    FRONTEND_URL: str = "http://localhost:3000"
    REDIS_URL: Optional[str] = None

    @property
    def is_development(self) -> bool:
        return self.APP_ENV == "development"


settings = Settings()
