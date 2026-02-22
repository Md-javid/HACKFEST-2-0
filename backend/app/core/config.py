"""
PolicyPulse AI – Configuration
"""
from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path
import os

# Always resolve .env relative to this file, regardless of cwd
_ENV_FILE = str(Path(__file__).parent.parent.parent / ".env")


class Settings(BaseSettings):
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "policypulse"

    AI_PROVIDER: str = "gemini"
    ANTHROPIC_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None

    UPLOAD_DIR: str = "./uploads"

    SCAN_INTERVAL_MINUTES: int = 30

    JWT_SECRET_KEY: str = "policypulse-super-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    FRONTEND_URL: str = "http://localhost:3000"

    class Config:
        env_file = _ENV_FILE


settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
