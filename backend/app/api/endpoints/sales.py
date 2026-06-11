from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.user import User
from app.models.cash_session import CashSession
from app.models.sale import Sale, SaleItem
from app.models.product import Product
from app.schemas.sale import SaleCreate, SaleResponse, SaleItemResponse

router = APIRouter()


def _get_open_session(db: Session) -> CashSession | None:
    return db.query(CashSession).filter(CashSession.status == "aberta").first()


def _sale_for_role(sale: Sale, role: str) -> SaleResponse:
    """Monta a resposta com nome do produto; vendedor não enxerga lucro nem custo."""
    resp = SaleResponse.model_validate(sale)
    for item_resp, item_orm in zip(resp.itens, sale.itens):
        item_resp.product_nome = item_orm.product.nome if item_orm.product else None
    if role == "vendedor":
        resp.total_lucro = None
        for item in resp.itens:
            item.preco_custo_unitario = None
            item.lucro_item = None
    return resp


@router.post("/", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
def create_sale(
    body: SaleCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente", "vendedor"])),
):
    cash = _get_open_session(db)
    if not cash:
        raise HTTPException(status_code=400, detail="No open cash session. Open cash first.")
    total_vendido = 0.0
    total_lucro = 0.0
    total_pecas = 0
    itens_to_create = []
    for item in body.itens:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        if product.estoque_atual < item.quantidade:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for product {product.nome} (has {product.estoque_atual})",
            )
        subtotal = item.quantidade * item.preco_unitario
        lucro_item = item.quantidade * (item.preco_unitario - item.preco_custo_unitario)
        total_vendido += subtotal
        total_lucro += lucro_item
        total_pecas += int(item.quantidade)
        itens_to_create.append(
            {
                "product_id": item.product_id,
                "quantidade": item.quantidade,
                "preco_unitario": item.preco_unitario,
                "preco_custo_unitario": item.preco_custo_unitario,
                "subtotal": subtotal,
                "lucro_item": lucro_item,
                "product": product,
            }
        )
    sale = Sale(
        cash_session_id=cash.id,
        data_venda=date.today(),
        total_vendido=total_vendido,
        total_lucro=total_lucro,
        total_pecas=total_pecas,
        tipo_pagamento=body.tipo_pagamento,
        status="concluida",
    )
    db.add(sale)
    db.flush()
    for row in itens_to_create:
        product = row["product"]
        product.estoque_atual -= row["quantidade"]
        si = SaleItem(
            sale_id=sale.id,
            product_id=row["product_id"],
            quantidade=row["quantidade"],
            preco_unitario=row["preco_unitario"],
            preco_custo_unitario=row["preco_custo_unitario"],
            subtotal=row["subtotal"],
            lucro_item=row["lucro_item"],
        )
        db.add(si)
    db.commit()
    db.refresh(sale)
    return sale


@router.get("/", response_model=list[SaleResponse])
def list_sales(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
):
    sales = db.query(Sale).order_by(Sale.id.desc()).offset(skip).limit(limit).all()
    return [_sale_for_role(s, user.role) for s in sales]


@router.get("/{sale_id}", response_model=SaleResponse)
def get_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    return _sale_for_role(sale, user.role)


class SaleUpdate(BaseModel):
    status: str | None = None  # "cancelada" to cancel


@router.patch("/{sale_id}", response_model=SaleResponse)
def update_sale(
    sale_id: int,
    body: SaleUpdate,
    db: Session = Depends(get_db),
    # Estorno devolve estoque e altera o fechamento — só admin/gerente.
    user: User = Depends(require_roles(["admin", "gerente"])),
):
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    if body.status == "cancelada":
        if sale.status == "cancelada":
            raise HTTPException(status_code=400, detail="Sale already cancelled")
        for item in sale.itens:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                product.estoque_atual += item.quantidade
        sale.status = "cancelada"
        db.commit()
        db.refresh(sale)
        return sale
    raise HTTPException(status_code=400, detail="Only status=cancelada is supported")
