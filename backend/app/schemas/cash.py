from datetime import datetime

from pydantic import BaseModel


class CashSessionOpen(BaseModel):
    valor_abertura: float = 0.0
    observacao: str | None = None


class CashSessionClose(BaseModel):
    valor_fechamento: float
    observacao: str | None = None


class CashSessionResponse(BaseModel):
    id: int
    data_abertura: datetime
    data_fechamento: datetime | None
    valor_abertura: float
    valor_fechamento: float | None
    status: str
    observacao: str | None

    class Config:
        from_attributes = True


class CashSessionUpdate(BaseModel):
    data_abertura: datetime | None = None
    data_fechamento: datetime | None = None
    valor_abertura: float | None = None
    valor_fechamento: float | None = None
    status: str | None = None
    observacao: str | None = None
