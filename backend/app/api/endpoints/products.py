from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.user import User
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductResponse, ProductUpdate

router = APIRouter()

UPLOAD_DIR = Path("uploads/products")
ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
MAX_IMAGE_BYTES = 8 * 1024 * 1024


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
                Product.codigo_barras.ilike(term),
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
    codigo_final = body.codigo.strip() if body.codigo else ""
    if not codigo_final:
        # Obter todos os códigos existentes para verificar a sequência
        todos_codigos = [p[0] for p in db.query(Product.codigo).all() if p[0]]
        
        # Tenta obter o nome da categoria para o prefixo
        nome_cat = None
        if body.categoria_id:
            from app.models.product_category import ProductCategory
            cat_obj = db.query(ProductCategory).filter(ProductCategory.id == body.categoria_id).first()
            if cat_obj:
                nome_cat = cat_obj.nome
        elif body.categoria:
            nome_cat = body.categoria
            
        if nome_cat:
            import unicodedata
            nome_norm = unicodedata.normalize("NFKD", nome_cat)
            nome_norm = "".join(
                ch for ch in nome_norm if not unicodedata.combining(ch)
            )
            letras = "".join(ch for ch in nome_norm if ch.isalpha()).upper()
            prefixo = letras[:4] if letras else "P"
            nums = []
            for c in todos_codigos:
                if not c.startswith(prefixo):
                    continue
                sufixo = c[len(prefixo):]
                if sufixo.isdigit():
                    nums.append(int(sufixo))
            prox = (max(nums) + 1) if nums else 1
            codigo_final = f"{prefixo}{prox:03d}"
        else:
            nums = []
            for c in todos_codigos:
                if len(c) >= 2 and c.startswith("P") and c[1:].isdigit():
                    nums.append(int(c[1:]))
            prox = (max(nums) + 1) if nums else 1
            codigo_final = f"P{prox:04d}"

    if db.query(Product).filter(Product.codigo == codigo_final).first():
        raise HTTPException(status_code=400, detail="Product code already exists")

    p = Product(
        codigo=codigo_final,
        codigo_barras=body.codigo_barras,
        nome=body.nome,
        categoria=body.categoria,
        marca=body.marca,
        preco_custo=body.preco_custo,
        preco_venda=body.preco_venda,
        estoque_atual=0.0,
        estoque_minimo=body.estoque_minimo,
        ativo=body.ativo,
        no_catalogo=body.no_catalogo,
        em_destaque=body.em_destaque,
        categoria_id=body.categoria_id,
        cores=body.cores,
        tamanhos=body.tamanhos,
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


@router.post("/{product_id}/image", response_model=ProductResponse)
def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente"])),
):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    ext = ALLOWED_IMAGE_TYPES.get(file.content_type or "")
    if not ext:
        raise HTTPException(status_code=415, detail="Formato inválido. Envie JPG, PNG ou WebP.")
    content = file.file.read(MAX_IMAGE_BYTES + 1)
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Imagem muito grande (máx. 5 MB).")
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    old = p.imagem_path
    filename = f"{product_id}-{uuid4().hex[:8]}{ext}"
    (UPLOAD_DIR / filename).write_bytes(content)
    p.imagem_path = f"/uploads/products/{filename}"
    db.commit()
    db.refresh(p)
    if old and old.startswith("/uploads/products/"):
        Path(old.lstrip("/")).unlink(missing_ok=True)
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
