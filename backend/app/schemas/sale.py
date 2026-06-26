from datetime import date, datetime

from pydantic import BaseModel


class SaleItemCreate(BaseModel):
    product_id: int
    quantidade: float
    preco_unitario: float
    preco_custo_unitario: float


class SaleCreate(BaseModel):
    tipo_pagamento: str | None = None
    desconto_tipo: str | None = None  # "percentual" | "valor"
    desconto_input: float | None = None  # valor digitado (% ou R$)
    itens: list[SaleItemCreate]
    client_id: int | None = None


class SaleItemResponse(BaseModel):
    id: int
    product_id: int
    product_nome: str | None = None
    quantidade: float
    preco_unitario: float
    # None quando o usuário não pode ver custo/lucro (vendedor).
    preco_custo_unitario: float | None
    subtotal: float
    lucro_item: float | None

    class Config:
        from_attributes = True


class SaleResponse(BaseModel):
    id: int
    cash_session_id: int
    user_id: int | None = None
    data_venda: date
    subtotal_bruto: float = 0.0
    desconto_tipo: str | None = None
    desconto_input: float | None = None
    desconto_valor: float = 0.0
    total_vendido: float
    # None quando o usuário não pode ver lucro (vendedor).
    total_lucro: float | None
    total_pecas: int
    comissao_percentual: float
    comissao_valor: float
    comissao_paga: bool
    tipo_pagamento: str | None
    status: str
    client_id: int | None = None
    created_at: datetime
    itens: list[SaleItemResponse] = []

    class Config:
        from_attributes = True
