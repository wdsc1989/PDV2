from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.user import User
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductResponse, ProductUpdate

router = APIRouter()


@router.get("/", response_model=list[ProductResponse])
def list_products(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    active_only: bool = True,
    q: str | None = Query(None, description="Search by name, code or category"),
    categoria_id: int | None = Query(None, description="Filter by category id"),
):
    query = db.query(Product)
    if active_only:
        query = query.filter(Product.ativo.is_(True))
    if categoria_id is not None:
        query = query.filter(Product.categoria_id == categoria_id)
    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Product.nome.ilike(term),
                Product.codigo.ilike(term),
                Product.categoria.ilike(term),
            )
        )
    return query.all()


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    body: ProductCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente"])),
):
    if db.query(Product).filter(Product.codigo == body.codigo).first():
        raise HTTPException(status_code=400, detail="Product code already exists")
    p = Product(
        codigo=body.codigo,
        nome=body.nome,
        categoria=body.categoria,
        marca=body.marca,
        preco_custo=body.preco_custo,
        preco_venda=body.preco_venda,
        estoque_atual=0.0,
        estoque_minimo=body.estoque_minimo,
        ativo=body.ativo,
        categoria_id=body.categoria_id,
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return p


@router.patch("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    body: ProductUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente"])),
):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin"])),
):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(p)
    db.commit()
