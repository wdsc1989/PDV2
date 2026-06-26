from datetime import date, datetime

from pydantic import BaseModel


class AccountReceivableBase(BaseModel):
    cliente: str
    descricao: str | None = None
    data_vencimento: date
    data_recebimento: date | None = None
    valor: float = 0.0
    observacao: str | None = None
    client_id: int | None = None


class AccountReceivableCreate(AccountReceivableBase):
    pass


class AccountReceivableUpdate(BaseModel):
    cliente: str | None = None
    descricao: str | None = None
    data_vencimento: date | None = None
    data_recebimento: date | None = None
    valor: float | None = None
    observacao: str | None = None
    client_id: int | None = None


class AccountReceivableResponse(AccountReceivableBase):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
