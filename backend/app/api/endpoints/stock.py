from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.user import User
from app.models.product import Product
from app.models.stock_entry import StockEntry
from app.schemas.stock import StockEntryCreate, StockEntryResponse

router = APIRouter()


@router.post("/entries", response_model=StockEntryResponse, status_code=status.HTTP_201_CREATED)
def create_stock_entry(
    body: StockEntryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente"])),
):
    product = db.query(Product).filter(Product.id == body.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if body.quantity <= 0:
        raise HTTPException(status_code=422, detail="Quantidade deve ser maior que zero")
    if body.preco_custo_unitario is not None and body.preco_custo_unitario < 0:
        raise HTTPException(status_code=422, detail="Custo unitário não pode ser negativo")
    entry = StockEntry(
        product_id=body.product_id,
        quantity=body.quantity,
        preco_custo_unitario=body.preco_custo_unitario,
        data_entrada=body.data_entrada,
        observacao=body.observacao,
    )
    db.add(entry)
    estoque_anterior = product.estoque_atual or 0
    # Custo médio ponderado: entradas com custo informado recalculam o custo do produto.
    if body.preco_custo_unitario is not None:
        custo_atual = product.preco_custo or 0.0
        base = max(estoque_anterior, 0)
        product.preco_custo = round(
            (base * custo_atual + body.quantity * body.preco_custo_unitario)
            / (base + body.quantity),
            2,
        )
    product.estoque_atual = estoque_anterior + body.quantity
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/entries", response_model=list[StockEntryResponse])
def list_stock_entries(
    product_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
):
    q = db.query(StockEntry)
    if product_id is not None:
        q = q.filter(StockEntry.product_id == product_id)
    return q.order_by(StockEntry.data_entrada.desc()).offset(skip).limit(limit).all()
