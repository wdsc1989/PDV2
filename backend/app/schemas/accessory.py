from datetime import date

from pydantic import BaseModel


class AccessoryStockResponse(BaseModel):
    id: int
    preco: float
    quantidade: float

    class Config:
        from_attributes = True


class AccessorySaleCreate(BaseModel):
    preco: float
    quantidade: float


class AccessorySaleResponse(BaseModel):
    id: int
    data_venda: date
    preco: float
    quantidade: float
    repasse_feito: bool

    class Config:
        from_attributes = True


class AccessoryStockEntryCreate(BaseModel):
    preco: float
    quantidade: float
    data_entrada: date


class AccessoryStockEntryResponse(BaseModel):
    id: int
    data_entrada: date
    preco: float
    quantidade: float

    class Config:
        from_attributes = True
