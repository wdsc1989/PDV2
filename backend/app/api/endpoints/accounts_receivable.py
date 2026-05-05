from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.user import User
from app.models.account_receivable import AccountReceivable
from app.schemas.account_receivable import (
    AccountReceivableCreate,
    AccountReceivableResponse,
    AccountReceivableUpdate,
)

router = APIRouter()


@router.get("/", response_model=list[AccountReceivableResponse])
def list_accounts_receivable(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente"])),
    status_filter: str | None = None,
):
    q = db.query(AccountReceivable)
    if status_filter:
        q = q.filter(AccountReceivable.status == status_filter)
    return q.order_by(AccountReceivable.data_vencimento).all()


@router.post("/", response_model=AccountReceivableResponse, status_code=status.HTTP_201_CREATED)
def create_account_receivable(
    body: AccountReceivableCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente"])),
):
    ar = AccountReceivable(
        cliente=body.cliente,
        descricao=body.descricao,
        data_vencimento=body.data_vencimento,
        data_recebimento=body.data_recebimento,
        valor=body.valor,
        observacao=body.observacao,
    )
    ar.update_status()
    db.add(ar)
    db.commit()
    db.refresh(ar)
    return ar


@router.get("/{item_id}", response_model=AccountReceivableResponse)
def get_account_receivable(
    item_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente"])),
):
    ar = db.query(AccountReceivable).filter(AccountReceivable.id == item_id).first()
    if not ar:
        raise HTTPException(status_code=404, detail="Not found")
    return ar


@router.patch("/{item_id}", response_model=AccountReceivableResponse)
def update_account_receivable(
    item_id: int,
    body: AccountReceivableUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente"])),
):
    ar = db.query(AccountReceivable).filter(AccountReceivable.id == item_id).first()
    if not ar:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(ar, k, v)
    ar.update_status()
    db.commit()
    db.refresh(ar)
    return ar


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account_receivable(
    item_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin"])),
):
    ar = db.query(AccountReceivable).filter(AccountReceivable.id == item_id).first()
    if not ar:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(ar)
    db.commit()
