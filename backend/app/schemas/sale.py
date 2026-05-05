from datetime import date, datetime

from pydantic import BaseModel


class SaleItemCreate(BaseModel):
    product_id: int
    quantidade: float
    preco_unitario: float
    preco_custo_unitario: float


class SaleCreate(BaseModel):
    tipo_pagamento: str | None = None
    itens: list[SaleItemCreate]


class SaleItemResponse(BaseModel):
    id: int
    product_id: int
    quantidade: float
    preco_unitario: float
    preco_custo_unitario: float
    subtotal: float
    lucro_item: float

    class Config:
        from_attributes = True


class SaleResponse(BaseModel):
    id: int
    cash_session_id: int
    data_venda: date
    total_vendido: float
    total_lucro: float
    total_pecas: int
    tipo_pagamento: str | None
    status: str
    created_at: datetime
    itens: list[SaleItemResponse] = []

    class Config:
        from_attributes = True
