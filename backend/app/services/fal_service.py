"""Integração com a fal.ai para gerar imagens de "looks" a partir das fotos dos produtos.

Fluxo: as imagens locais dos produtos são enviadas ao storage da fal (para virarem
URLs públicas), o modelo configurado (FAL_MODEL) compõe o look com base no prompt e
nas imagens de referência, e o resultado é baixado para uploads/looks/.
"""
import os
import urllib.request
from pathlib import Path
from uuid import uuid4

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.ai_config import AIConfig

LOOKS_DIR = Path("uploads/looks")
FAL_PROVIDER = "fal"


class FalNotConfigured(Exception):
    pass


def resolve_fal_config(db: Session) -> tuple[str | None, str]:
    """Resolve a chave e o modelo da fal.ai: banco (Configurações) primeiro, .env como fallback."""
    cfg = db.query(AIConfig).filter(AIConfig.provider == FAL_PROVIDER).first()
    api_key = (cfg.api_key.strip() if cfg and cfg.api_key else "") or (settings.FAL_KEY or "")
    model = (cfg.model if cfg and cfg.model else "") or settings.FAL_MODEL
    return (api_key or None), model


def generate_look(image_paths: list[str], prompt: str, api_key: str | None, model: str) -> str:
    """Gera o look e retorna o caminho público salvo (ex.: /uploads/looks/xyz.png)."""
    if not api_key:
        raise FalNotConfigured(
            "Chave da fal.ai não configurada. Defina em Administração → Configuração fal.ai (Looks)."
        )
    # fal_client lê a chave de FAL_KEY no ambiente.
    os.environ["FAL_KEY"] = api_key
    import fal_client  # import tardio: dependência só é necessária aqui

    # Sobe as imagens de referência para o storage da fal e coleta as URLs.
    image_urls: list[str] = []
    for p in image_paths:
        local = Path(p.lstrip("/")) if p.startswith("/") else Path(p)
        if not local.exists():
            continue
        image_urls.append(fal_client.upload_file(str(local)))
    if not image_urls:
        raise FalNotConfigured("Nenhuma imagem de produto válida foi encontrada para gerar o look.")

    result = fal_client.subscribe(
        model,
        arguments={"prompt": prompt, "image_urls": image_urls, "num_images": 1},
        with_logs=False,
    )

    images = (result or {}).get("images") or []
    if not images or not images[0].get("url"):
        raise FalNotConfigured("A fal.ai não retornou imagem. Verifique o modelo (FAL_MODEL) e a chave.")
    out_url = images[0]["url"]

    LOOKS_DIR.mkdir(parents=True, exist_ok=True)
    ext = ".png"
    if "." in out_url.split("/")[-1]:
        cand = "." + out_url.split("/")[-1].split(".")[-1].split("?")[0]
        if len(cand) <= 5:
            ext = cand
    filename = f"{uuid4().hex}{ext}"
    with urllib.request.urlopen(out_url) as resp:  # noqa: S310 (URL vem da fal.ai)
        (LOOKS_DIR / filename).write_bytes(resp.read())
    return f"/uploads/looks/{filename}"
