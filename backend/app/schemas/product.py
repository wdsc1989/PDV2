from datetime import datetime
from pydantic import BaseModel


class ProductBase(BaseModel):
    codigo: str | None = None
    codigo_barras: str | None = None
    nome: str
    categoria: str | None = None
    marca: str | None = None
    preco_custo: float = 0.0
    preco_venda: float = 0.0
    estoque_minimo: float | None = None
    ativo: bool = True
    no_catalogo: bool = True
    em_destaque: bool = False
    categoria_id: int | None = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    codigo: str | None = None
    codigo_barras: str | None = None
    nome: str | None = None
    categoria: str | None = None
    marca: str | None = None
    preco_custo: float | None = None
    preco_venda: float | None = None
    estoque_minimo: float | None = None
    ativo: bool | None = None
    no_catalogo: bool | None = None
    em_destaque: bool | None = None
    categoria_id: int | None = None
    imagem_path: str | None = None


class ProductResponse(ProductBase):
    id: int
    estoque_atual: float
    imagem_path: str | None = None

    class Config:
        from_attributes = True


class CatalogProduct(BaseModel):
    """Produto exposto na vitrine pública (sem custo nem estoque)."""
    id: int
    nome: str
    categoria: str | None = None
    marca: str | None = None
    preco_venda: float
    imagem_path: str | None = None
    em_destaque: bool
    created_at: datetime

    class Config:
        from_attributes = True
