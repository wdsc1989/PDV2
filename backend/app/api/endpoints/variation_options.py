from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.user import User
from app.models.variation_option import VariationOption
from app.schemas.variation_option import VariationOptionCreate, VariationOptionResponse

router = APIRouter()

TIPOS = ("cor", "tamanho")


@router.get("/", response_model=list[VariationOptionResponse])
def list_options(
    tipo: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Opcoes cadastradas (ativas). Opcional filtrar por tipo (cor|tamanho)."""
    q = db.query(VariationOption).filter(VariationOption.ativo.is_(True))
    if tipo in TIPOS:
        q = q.filter(VariationOption.tipo == tipo)
    return q.order_by(VariationOption.tipo, VariationOption.ordem, VariationOption.valor).all()


@router.post("/", response_model=VariationOptionResponse, status_code=status.HTTP_201_CREATED)
def create_option(
    body: VariationOptionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente"])),
):
    """Cadastra uma cor/tamanho padrao. Idempotente: se ja existe, devolve a
    existente (reativando se estava inativa)."""
    tipo = (body.tipo or "").strip().lower()
    if tipo not in TIPOS:
        raise HTTPException(status_code=400, detail="tipo deve ser 'cor' ou 'tamanho'")
    valor = (body.valor or "").strip()
    if not valor:
        raise HTTPException(status_code=400, detail="valor obrigatório")

    existente = (
        db.query(VariationOption)
        .filter(VariationOption.tipo == tipo, func.lower(VariationOption.valor) == valor.lower())
        .first()
    )
    if existente:
        if not existente.ativo:
            existente.ativo = True
            db.commit()
            db.refresh(existente)
        return existente

    opt = VariationOption(tipo=tipo, valor=valor, ordem=body.ordem or 0)
    db.add(opt)
    db.commit()
    db.refresh(opt)
    return opt


@router.delete("/{option_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_option(
    option_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente"])),
):
    opt = db.query(VariationOption).filter(VariationOption.id == option_id).first()
    if not opt:
        raise HTTPException(status_code=404, detail="Opção não encontrada")
    db.delete(opt)
    db.commit()
