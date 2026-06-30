from datetime import date, datetime
from pydantic import BaseModel


class StockEntryCreate(BaseModel):
    product_id: int
    quantity: float
    preco_custo_unitario: float | None = None
    data_entrada: date
    observacao: str | None = None


class StockEntryResponse(BaseModel):
    id: int
    product_id: int
    quantity: float
    preco_custo_unitario: float | None
    data_entrada: date
    observacao: str | None

    class Config:
        from_attributes = True


class ProductSimple(BaseModel):
    id: int
    nome: str

    class Config:
        from_attributes = True


class UserSimple(BaseModel):
    id: int
    username: str
    name: str

    class Config:
        from_attributes = True


class StockAdjustmentCreate(BaseModel):
    product_id: int
    quantidade_nova: float
    motivo: str
    observacao: str | None = None


class StockAdjustmentResponse(BaseModel):
    id: int
    product_id: int
    user_id: int
    quantidade_anterior: float
    quantidade_nova: float
    diferenca: float
    motivo: str
    observacao: str | None
    created_at: datetime
    product: ProductSimple | None = None
    user: UserSimple | None = None

    class Config:
        from_attributes = True
