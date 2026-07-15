from pydantic import BaseModel


class VariationOptionBase(BaseModel):
    tipo: str  # "cor" | "tamanho"
    valor: str
    ordem: int = 0


class VariationOptionCreate(VariationOptionBase):
    pass


class VariationOptionResponse(VariationOptionBase):
    id: int
    ativo: bool

    class Config:
        from_attributes = True
