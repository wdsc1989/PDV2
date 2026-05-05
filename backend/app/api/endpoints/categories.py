from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.user import User
from app.models.product_category import ProductCategory
from app.schemas.category import ProductCategoryCreate, ProductCategoryResponse, ProductCategoryUpdate

router = APIRouter()


@router.get("/", response_model=list[ProductCategoryResponse])
def list_categories(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return db.query(ProductCategory).filter(ProductCategory.ativo.is_(True)).all()


@router.get("/all", response_model=list[ProductCategoryResponse])
def list_all_categories(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente"])),
):
    return db.query(ProductCategory).all()


@router.post("/", response_model=ProductCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    body: ProductCategoryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente"])),
):
    if db.query(ProductCategory).filter(ProductCategory.nome == body.nome).first():
        raise HTTPException(status_code=400, detail="Category name already exists")
    cat = ProductCategory(nome=body.nome, descricao=body.descricao, ativo=body.ativo)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.get("/{category_id}", response_model=ProductCategoryResponse)
def get_category(
    category_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    cat = db.query(ProductCategory).filter(ProductCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return cat


@router.patch("/{category_id}", response_model=ProductCategoryResponse)
def update_category(
    category_id: int,
    body: ProductCategoryUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente"])),
):
    cat = db.query(ProductCategory).filter(ProductCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    if body.nome is not None:
        cat.nome = body.nome
    if body.descricao is not None:
        cat.descricao = body.descricao
    if body.ativo is not None:
        cat.ativo = body.ativo
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin"])),
):
    cat = db.query(ProductCategory).filter(ProductCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(cat)
    db.commit()
