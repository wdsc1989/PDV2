from __future__ import annotations

"""
Generic AI service wrapper for PDV2.

This encapsulates provider-specific client initialization so that higher-level
agents (e.g. report and accounts agents) can call a single interface.
"""

from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.core.ai_config import AIConfigManager


class AIService:
    """
    Small facade over different AI providers (OpenAI, Gemini, Groq, Ollama).
    """

    def __init__(self, db: Session):
        self.db = db
        self.config = AIConfigManager.get_config_dict(db)
        self._client: Any | None = None

    def is_available(self) -> bool:
        """Return True when there is a usable configuration."""
        return AIConfigManager.is_configured(self.db) and self.config is not None

    def _get_client(self) -> Tuple[Any | None, str | None]:
        """
        Return (client, error_message).

        error_message is None on success; otherwise client will be None.
        """
        if not self.config:
            return None, "Configuração de IA não encontrada"

        if self._client is not None:
            return self._client, None

        provider = self.config["provider"]
        api_key = (self.config.get("api_key") or "").strip()

        # Ollama via OpenAI-compatible API does not require a real API key.
        if provider != "ollama" and not api_key:
            return None, f"Chave de API não configurada para {provider}"

        try:
            if provider == "openai":
                try:
                    from openai import OpenAI  # type: ignore
                except ImportError:
                    return None, "Biblioteca 'openai' não instalada. Execute: pip install openai"
                self._client = OpenAI(api_key=api_key)
                return self._client, None

            if provider == "gemini":
                try:
                    import google.generativeai as genai  # type: ignore
                except ImportError:
                    return None, "Biblioteca 'google-generativeai' não instalada. Execute: pip install google-generativeai"
                genai.configure(api_key=api_key)
                model_name = self.config.get("model") or "gemini-1.5-flash"
                self._client = genai.GenerativeModel(model_name)
                return self._client, None

            if provider == "ollama":
                try:
                    from openai import OpenAI  # type: ignore
                except ImportError:
                    return None, "Biblioteca 'openai' não instalada. Execute: pip install openai"
                base_url = (self.config.get("base_url") or "http://localhost:11434").rstrip("/")
                if not base_url.endswith("/v1"):
                    base_url = base_url + "/v1"
                # For Ollama, API key is not used but OpenAI client requires a value.
                self._client = OpenAI(api_key="ollama", base_url=base_url)
                return self._client, None

            if provider == "groq":
                try:
                    from groq import Groq  # type: ignore
                except ImportError:
                    return None, "Biblioteca 'groq' não instalada. Execute: pip install groq"
                self._client = Groq(api_key=api_key)
                return self._client, None

            return None, f"Provedor '{provider}' não suportado"
        except Exception as exc:  # pragma: no cover - defensive
            return None, f"Erro ao inicializar cliente de IA ({provider}): {exc}"

    def test_connection(self) -> Tuple[bool, str]:
        """
        Perform a minimal request to verify connectivity.
        """
        client, error = self._get_client()
        if error:
            return False, error
        provider = self.config["provider"] if self.config else ""
        model = (self.config or {}).get("model", "")
        try:
            if provider == "openai":
                client.chat.completions.create(  # type: ignore[attr-defined]
                    model=model or "gpt-4o-mini",
                    messages=[{"role": "user", "content": "Diga apenas OK"}],
                    max_tokens=5,
                )
            elif provider == "gemini":
                client.generate_content("Diga apenas OK")  # type: ignore[attr-defined]
            elif provider == "groq":
                client.chat.completions.create(  # type: ignore[attr-defined]
                    model=model or "llama-3.3-70b-versatile",
                    messages=[{"role": "user", "content": "Diga apenas OK"}],
                    max_tokens=5,
                )
            elif provider == "ollama":
                client.chat(  # type: ignore[attr-defined]
                    model=model or "llama3.2",
                    messages=[{"role": "user", "content": "Diga apenas OK"}],
                    options={"num_predict": 5},
                )
            else:
                return False, f"Provedor {provider} não suportado"
            return True, "Conexão com a API realizada com sucesso."
        except Exception as exc:  # pragma: no cover - defensive
            return False, str(exc)

    def generate_chat(self, messages: List[Dict[str, str]], model_override: Optional[str] = None) -> Tuple[str | None, str | None]:
        """
        Unified chat-completion style interface.

        Returns (text, error_message). Only one of them will be non-None.
        """
        client, error = self._get_client()
        if error:
            return None, error
        provider = self.config["provider"] if self.config else ""
        model = model_override or (self.config or {}).get("model", "")

        try:
            if provider in ("openai", "ollama", "groq"):
                # All use Chat Completions-like API.
                if provider == "groq":
                    resp = client.chat.completions.create(  # type: ignore[attr-defined]
                        model=model or "llama-3.3-70b-versatile",
                        messages=messages,
                    )
                    content = resp.choices[0].message.content  # type: ignore[index]
                    return str(content), None
                else:
                    resp = client.chat.completions.create(  # type: ignore[attr-defined]
                        model=model or ("llama3.2" if provider == "ollama" else "gpt-4o-mini"),
                        messages=messages,
                    )
                    content = resp.choices[0].message.content  # type: ignore[index]
                    return str(content), None

            if provider == "gemini":
                # For Gemini, convert to a single concatenated prompt.
                text_parts = []
                for m in messages:
                    role = m.get("role", "user")
                    prefix = "Usuário: " if role == "user" else "Assistente: "
                    text_parts.append(prefix + (m.get("content") or ""))
                prompt = "\n".join(text_parts)
                resp = client.generate_content(prompt)  # type: ignore[attr-defined]
                out = getattr(resp, "text", None) or ""
                return str(out), None

            return None, f"Provedor {provider} não suportado para geração de chat"
        except Exception as exc:  # pragma: no cover - defensive
            return None, str(exc)

