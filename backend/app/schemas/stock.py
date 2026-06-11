from datetime import date

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
