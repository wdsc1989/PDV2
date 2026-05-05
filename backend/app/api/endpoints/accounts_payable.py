from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.user import User
from app.models.account_payable import AccountPayable
from app.schemas.account_payable import (
    AccountPayableCreate,
    AccountPayableResponse,
    AccountPayableUpdate,
)

router = APIRouter()


@router.get("/", response_model=list[AccountPayableResponse])
def list_accounts_payable(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente"])),
    status_filter: str | None = None,
):
    q = db.query(AccountPayable)
    if status_filter:
        q = q.filter(AccountPayable.status == status_filter)
    return q.order_by(AccountPayable.data_vencimento).all()


@router.post("/", response_model=AccountPayableResponse, status_code=status.HTTP_201_CREATED)
def create_account_payable(
    body: AccountPayableCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente"])),
):
    ap = AccountPayable(
        fornecedor=body.fornecedor,
        descricao=body.descricao,
        data_vencimento=body.data_vencimento,
        data_pagamento=body.data_pagamento,
        valor=body.valor,
        observacao=body.observacao,
    )
    ap.update_status()
    db.add(ap)
    db.commit()
    db.refresh(ap)
    return ap


@router.get("/{item_id}", response_model=AccountPayableResponse)
def get_account_payable(
    item_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente"])),
):
    ap = db.query(AccountPayable).filter(AccountPayable.id == item_id).first()
    if not ap:
        raise HTTPException(status_code=404, detail="Not found")
    return ap


@router.patch("/{item_id}", response_model=AccountPayableResponse)
def update_account_payable(
    item_id: int,
    body: AccountPayableUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente"])),
):
    ap = db.query(AccountPayable).filter(AccountPayable.id == item_id).first()
    if not ap:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(ap, k, v)
    ap.update_status()
    db.commit()
    db.refresh(ap)
    return ap


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account_payable(
    item_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin"])),
):
    ap = db.query(AccountPayable).filter(AccountPayable.id == item_id).first()
    if not ap:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(ap)
    db.commit()
