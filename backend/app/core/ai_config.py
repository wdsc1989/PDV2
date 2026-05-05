from __future__ import annotations

"""
AI configuration manager for PDV2.

Centralizes provider/model/api_key/base_url configuration and supports:
- Single active configuration stored in the database (AIConfig table)
- Optional fixed configuration via environment variables (for simple deployments)
"""

from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.models.ai_config import AIConfig
from app.core.config import settings


class AIConfigManager:
    """
    Manage AI provider configuration (OpenAI, Gemini, Groq, Ollama, etc.).
    """

    DEFAULT_MODELS: Dict[str, str] = {
        "openai": "gpt-4o",
        "gemini": "gemini-1.5-flash",
        "ollama": "llama3.2",
        "groq": "llama-3.3-70b-versatile",
    }

    DEFAULT_BASE_URLS: Dict[str, str] = {
        "ollama": "http://localhost:11434",
    }

    # Values loaded from pydantic Settings (env_file=.env)
    FIXED_PROVIDER = settings.AI_FIXED_PROVIDER or "openai"
    FIXED_MODEL = settings.AI_FIXED_MODEL or DEFAULT_MODELS.get("openai", "gpt-4o")
    FIXED_API_KEY = settings.AI_FIXED_API_KEY
    FIXED_CONFIG_ENABLED = bool(settings.AI_FIXED_CONFIG_ENABLED)

    @staticmethod
    def get_config(db: Session) -> Optional[AIConfig]:
        """
        Return the active AIConfig row from the database, if any.
        """
        return db.query(AIConfig).filter(AIConfig.enabled.is_(True)).first()

    @staticmethod
    def get_config_by_provider(db: Session, provider: str) -> Optional[AIConfig]:
        """
        Return configuration for a specific provider, if it exists.
        """
        return db.query(AIConfig).filter(AIConfig.provider == provider).first()

    @staticmethod
    def save_config(
        db: Session,
        provider: str,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        base_url: Optional[str] = None,
        enabled: bool = True,
    ) -> AIConfig:
        """
        Create or update configuration for a provider.

        When enabled=True, marks this config as the only active one.
        """
        if enabled:
            db.query(AIConfig).filter(AIConfig.enabled.is_(True)).update({"enabled": False})

        config = db.query(AIConfig).filter(AIConfig.provider == provider).first()

        if config:
            if api_key is not None:
                config.api_key = api_key
            if model is not None:
                config.model = model
            if base_url is not None:
                config.base_url = base_url
            config.enabled = enabled
        else:
            if model is None:
                model = AIConfigManager.DEFAULT_MODELS.get(provider)
            if base_url is None and provider in AIConfigManager.DEFAULT_BASE_URLS:
                base_url = AIConfigManager.DEFAULT_BASE_URLS[provider]
            config = AIConfig(
                provider=provider,
                api_key=api_key or "",
                model=model,
                base_url=base_url,
                enabled=enabled,
            )
            db.add(config)

        db.commit()
        db.refresh(config)
        return config

    @staticmethod
    def delete_config(db: Session, provider: str) -> bool:
        """
        Remove configuration for the given provider.
        """
        config = db.query(AIConfig).filter(AIConfig.provider == provider).first()
        if config:
            db.delete(config)
            db.commit()
            return True
        return False

    @staticmethod
    def get_all_configs(db: Session) -> list[AIConfig]:
        """
        Return all AIConfig rows.
        """
        return db.query(AIConfig).all()

    @staticmethod
    def _get_fixed_config() -> Optional[Dict[str, Any]]:
        """
        Fallback: configuration via environment variables.

        Useful for simple deployments where we don't want to store API keys in DB.
        """
        if not AIConfigManager.FIXED_CONFIG_ENABLED:
            return None
        api_key = (AIConfigManager.FIXED_API_KEY or "").strip()
        if not api_key:
            return None
        return {
            "provider": AIConfigManager.FIXED_PROVIDER,
            "api_key": api_key,
            "model": AIConfigManager.FIXED_MODEL,
            "base_url": AIConfigManager.DEFAULT_BASE_URLS.get(AIConfigManager.FIXED_PROVIDER),
            "enabled": True,
        }

    @staticmethod
    def is_configured(db: Session) -> bool:
        """
        True when there is either an active DB config or a valid fixed config.
        """
        config = AIConfigManager.get_config(db)
        if config and config.api_key and config.enabled:
            return True
        return AIConfigManager._get_fixed_config() is not None

    @staticmethod
    def get_config_dict(db: Session) -> Optional[Dict[str, Any]]:
        """
        Return the active configuration as a plain dict, resolving fixed config when needed.
        """
        config = AIConfigManager.get_config(db)
        if not config:
            return AIConfigManager._get_fixed_config()
        return {
            "provider": config.provider,
            "api_key": config.api_key,
            "model": config.model,
            "base_url": config.base_url,
            "enabled": config.enabled,
        }

