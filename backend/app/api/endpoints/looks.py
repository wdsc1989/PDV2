import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import require_roles
from app.models.user import User
from app.models.product import Product
from app.models.look import Look
from app.models.ai_config import AIConfig
from app.schemas.look import LookCreate, LookResponse
from app.services.fal_service import FAL_PROVIDER, FalNotConfigured, generate_look, resolve_fal_config

router = APIRouter()


class FalConfigIn(BaseModel):
    api_key: str | None = None
    model: str | None = None


class FalConfigOut(BaseModel):
    configured: bool  # há chave (no banco ou no .env)
    has_key: bool
    model: str


@router.get("/config", response_model=FalConfigOut)
def get_fal_config(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin"])),
):
    """Status da configuração da fal.ai (nunca devolve a chave em texto)."""
    api_key, model = resolve_fal_config(db)
    return FalConfigOut(configured=bool(api_key), has_key=bool(api_key), model=model)


@router.put("/config", response_model=FalConfigOut)
def set_fal_config(
    body: FalConfigIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin"])),
):
    """Salva a chave/modelo da fal.ai nas Configurações (enabled=False: não vira provedor de chat)."""
    cfg = db.query(AIConfig).filter(AIConfig.provider == FAL_PROVIDER).first()
    if cfg is None:
        cfg = AIConfig(
            provider=FAL_PROVIDER,
            api_key=(body.api_key or "").strip(),
            model=(body.model or settings.FAL_MODEL).strip(),
            enabled=False,
        )
        db.add(cfg)
    else:
        # chave em branco = manter a atual
        if body.api_key is not None and body.api_key.strip():
            cfg.api_key = body.api_key.strip()
        if body.model is not None and body.model.strip():
            cfg.model = body.model.strip()
        cfg.enabled = False
    db.commit()
    api_key, model = resolve_fal_config(db)
    return FalConfigOut(configured=bool(api_key), has_key=bool(api_key), model=model)


def _build_prompt(
    partes: list[tuple[str, Product]],
    pose: str | None,
    extra: str | None,
    tamanho: str | None = None,
    caimento: str | None = None,
) -> str:
    itens = "; ".join(f"{papel}: {p.nome}" for papel, p in partes)
    pose_txt = pose.strip() if pose else "em pé, corpo inteiro, vista frontal"
    
    tamanho_map = {
        "P": "modelo de tamanho pequeno (petite, size S)",
        "M": "modelo de tamanho médio (medium size M)",
        "G": "modelo de tamanho grande (curvy, size L)",
        "GG": "modelo de tamanho extra grande (extra curvy, size XL)",
        "PLUSIZE": "modelo de tamanho Plus Size (plus size, size XXL)"
    }
    tamanho_desc = tamanho_map.get(tamanho, "modelo de moda")
    
    prompt = (
        f"Gere uma foto realista de uma {tamanho_desc} vestindo as peças a seguir, "
        f"combinando-as em um look coeso ({itens}). "
        "Strictly preserve the exact colors, color shades, patterns, and design details of the clothing items from the input reference images on the model. The generated garments must have the exact same colors and hues as the provided product images. Do not change, alter, or desaturate the colors. "
    )
    
    if caimento and caimento.strip():
        prompt += f"Estilo de caimento no corpo: {caimento.strip()}. "
        
    prompt += f"Pose da modelo: {pose_txt}. Fundo de estúdio neutro, iluminação suave, alta qualidade."
    
    if extra and extra.strip():
        prompt += f" {extra.strip()}"
    return prompt


@router.post("/", response_model=LookResponse, status_code=status.HTTP_201_CREATED)
def create_look(
    body: LookCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente"])),
):
    selecoes = [
        ("parte superior", body.superior_id),
        ("parte inferior", body.inferior_id),
        ("conjunto", body.conjunto_id),
    ]
    partes: list[tuple[str, Product]] = []
    image_paths: list[str] = []
    for papel, pid in selecoes:
        if pid is None:
            continue
        prod = db.query(Product).filter(Product.id == pid).first()
        if not prod:
            raise HTTPException(status_code=404, detail=f"Produto {pid} não encontrado")
        if not prod.imagem_path:
            raise HTTPException(status_code=400, detail=f"O produto '{prod.nome}' não tem foto.")
        partes.append((papel, prod))
        image_paths.append(prod.imagem_path)

    if not partes:
        raise HTTPException(status_code=400, detail="Selecione ao menos uma peça (superior, inferior ou conjunto).")

    prompt = _build_prompt(partes, body.pose, body.extra_prompt, body.tamanho, body.caimento)
    api_key, model = resolve_fal_config(db)
    try:
        imagem_path = generate_look(image_paths, prompt, api_key, model)
    except FalNotConfigured as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:  # falha na chamada externa
        raise HTTPException(status_code=502, detail=f"Falha ao gerar o look na fal.ai: {e}")

    look = Look(
        nome=body.nome.strip() or "Look",
        imagem_path=imagem_path,
        prompt=prompt,
        source_product_ids=json.dumps([{"product_id": p.id, "papel": papel} for papel, p in partes]),
        opcoes=json.dumps({
            "pose": body.pose,
            "extra_prompt": body.extra_prompt,
            "tamanho": body.tamanho,
            "caimento": body.caimento
        }),
        created_by=user.id,
    )
    db.add(look)
    db.commit()
    db.refresh(look)
    
    info = _look_pieces(db, look)
    look.pieces = info["pieces"]
    look.valor_total = info["valor_total"]
    return look


def _look_pieces(db: Session, look: Look) -> dict:
    pieces = []
    valor_total = 0.0
    if not look.source_product_ids:
        return {"pieces": pieces, "valor_total": valor_total}
    try:
        data = json.loads(look.source_product_ids)
    except Exception:
        data = []
    
    normalized = []
    if isinstance(data, list):
        for item in data:
            if isinstance(item, dict):
                pid = item.get("product_id")
                papel = item.get("papel", "peça")
                if pid is not None:
                    normalized.append((pid, papel))
            elif isinstance(item, int):
                normalized.append((item, "peça"))
                
    for pid, papel in normalized:
        prod = db.query(Product).filter(Product.id == pid).first()
        if prod:
            pieces.append({
                "id": prod.id,
                "nome": prod.nome,
                "papel": papel,
                "preco_venda": prod.preco_venda,
                "imagem_path": prod.imagem_path,
                "em_destaque": prod.em_destaque,
                "categoria": prod.categoria,
                "marca": prod.marca,
            })
            valor_total += prod.preco_venda
    return {"pieces": pieces, "valor_total": valor_total}


class LookPatch(BaseModel):
    publicado: bool


@router.patch("/{look_id}", response_model=LookResponse)
def patch_look(
    look_id: int,
    body: LookPatch,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente"])),
):
    look = db.query(Look).filter(Look.id == look_id).first()
    if not look:
        raise HTTPException(status_code=404, detail="Look não encontrado")
    look.publicado = body.publicado
    db.commit()
    db.refresh(look)
    
    info = _look_pieces(db, look)
    look.pieces = info["pieces"]
    look.valor_total = info["valor_total"]
    return look


@router.get("/", response_model=list[LookResponse])
def list_looks(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente", "vendedor"])),
):
    results = db.query(Look).order_by(Look.id.desc()).all()
    for look in results:
        info = _look_pieces(db, look)
        look.pieces = info["pieces"]
        look.valor_total = info["valor_total"]
    return results


@router.delete("/{look_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_look(
    look_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente"])),
):
    look = db.query(Look).filter(Look.id == look_id).first()
    if not look:
        raise HTTPException(status_code=404, detail="Look não encontrado")
    if look.imagem_path and look.imagem_path.startswith("/uploads/looks/"):
        Path(look.imagem_path.lstrip("/")).unlink(missing_ok=True)
    db.delete(look)
    db.commit()
