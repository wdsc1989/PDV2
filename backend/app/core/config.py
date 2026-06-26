"""
Application settings from environment.
"""
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "PDV2"
    API_V1_STR: str = "/api/v1"

    DATABASE_URL: str = "sqlite:///./data/pdv.db"
    # Production: set DATABASE_URL=postgresql://user:pass@host:5432/pdv_db

    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Optional fixed AI configuration (also read directly via os.getenv in AIConfigManager).
    AI_FIXED_PROVIDER: str | None = None
    AI_FIXED_MODEL: str | None = None
    AI_FIXED_API_KEY: str | None = None
    AI_FIXED_CONFIG_ENABLED: bool = False

    # fal.ai — gerador de "looks" a partir das fotos dos produtos.
    FAL_KEY: str | None = None
    FAL_MODEL: str = "fal-ai/nano-banana/edit"  # aceita prompt + image_urls (múltiplas referências)

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
