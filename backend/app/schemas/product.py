from pydantic import BaseModel


class ProductBase(BaseModel):
    codigo: str
    nome: str
    categoria: str | None = None
    marca: str | None = None
    preco_custo: float = 0.0
    preco_venda: float = 0.0
    estoque_minimo: float | None = None
    ativo: bool = True
    categoria_id: int | None = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    codigo: str | None = None
    nome: str | None = None
    categoria: str | None = None
    marca: str | None = None
    preco_custo: float | None = None
    preco_venda: float | None = None
    estoque_minimo: float | None = None
    ativo: bool | None = None
    categoria_id: int | None = None
    imagem_path: str | None = None


class ProductResponse(ProductBase):
    id: int
    estoque_atual: float
    imagem_path: str | None = None

    class Config:
        from_attributes = True
