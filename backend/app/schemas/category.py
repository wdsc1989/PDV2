from pydantic import BaseModel


class ProductCategoryBase(BaseModel):
    nome: str
    descricao: str | None = None
    ativo: bool = True


class ProductCategoryCreate(ProductCategoryBase):
    pass


class ProductCategoryUpdate(BaseModel):
    nome: str | None = None
    descricao: str | None = None
    ativo: bool | None = None


class ProductCategoryResponse(ProductCategoryBase):
    id: int

    class Config:
        from_attributes = True
