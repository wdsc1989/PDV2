from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.user import User
from app.models.accessory import AccessoryStock, AccessorySale, AccessoryStockEntry
from app.schemas.accessory import (
    AccessorySaleCreate,
    AccessorySaleResponse,
    AccessoryStockEntryCreate,
    AccessoryStockEntryResponse,
    AccessoryStockResponse,
)

router = APIRouter()


@router.get("/stock", response_model=list[AccessoryStockResponse])
def list_accessory_stock(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return db.query(AccessoryStock).all()


@router.post("/stock/entry", response_model=AccessoryStockEntryResponse, status_code=status.HTTP_201_CREATED)
def create_accessory_stock_entry(
    body: AccessoryStockEntryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente"])),
):
    entry = AccessoryStockEntry(
        data_entrada=body.data_entrada,
        preco=body.preco,
        quantidade=body.quantidade,
    )
    db.add(entry)
    stock = db.query(AccessoryStock).filter(AccessoryStock.preco == body.preco).first()
    if not stock:
        stock = AccessoryStock(preco=body.preco, quantidade=0.0)
        db.add(stock)
        db.flush()
    stock.quantidade += body.quantidade
    db.commit()
    db.refresh(entry)
    return entry


@router.post("/sale", response_model=AccessorySaleResponse, status_code=status.HTTP_201_CREATED)
def create_accessory_sale(
    body: AccessorySaleCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente", "vendedor"])),
):
    stock = db.query(AccessoryStock).filter(AccessoryStock.preco == body.preco).first()
    if not stock or stock.quantidade < body.quantidade:
        raise HTTPException(status_code=400, detail="Insufficient accessory stock")
    sale = AccessorySale(
        data_venda=date.today(),
        preco=body.preco,
        quantidade=body.quantidade,
        repasse_feito=False,
    )
    db.add(sale)
    stock.quantidade -= body.quantidade
    db.commit()
    db.refresh(sale)
    return sale


@router.get("/sales", response_model=list[AccessorySaleResponse])
def list_accessory_sales(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
):
    return db.query(AccessorySale).order_by(AccessorySale.data_venda.desc()).offset(skip).limit(limit).all()
