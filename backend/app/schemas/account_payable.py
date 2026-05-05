from datetime import date, datetime

from pydantic import BaseModel


class AccountPayableBase(BaseModel):
    fornecedor: str
    descricao: str | None = None
    data_vencimento: date
    data_pagamento: date | None = None
    valor: float = 0.0
    observacao: str | None = None


class AccountPayableCreate(AccountPayableBase):
    pass


class AccountPayableUpdate(BaseModel):
    fornecedor: str | None = None
    descricao: str | None = None
    data_vencimento: date | None = None
    data_pagamento: date | None = None
    valor: float | None = None
    observacao: str | None = None


class AccountPayableResponse(AccountPayableBase):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
