from datetime import datetime
from pydantic import BaseModel, field_validator


class CatalogLeadCreate(BaseModel):
    nome: str | None = None
    email: str
    whatsapp: str
    consent: bool
    look_id: int | None = None
    product_id: int | None = None
    tipo: str  # 'novidades', 'look' ou 'produto'

    @field_validator('consent')
    @classmethod
    def check_consent(cls, v: bool) -> bool:
        if not v:
            raise ValueError("O consentimento para uso de dados é obrigatório.")
        return v

    @field_validator('email')
    @classmethod
    def check_email(cls, v: str) -> str:
        val = v.strip()
        if not val:
            raise ValueError("O e-mail é obrigatório.")
        if "@" not in val:
            raise ValueError("E-mail inválido.")
        return val

    @field_validator('whatsapp')
    @classmethod
    def check_whatsapp(cls, v: str) -> str:
        val = v.strip()
        if not val:
            raise ValueError("O WhatsApp é obrigatório.")
        return val


class CatalogLeadResponse(BaseModel):
    id: int
    nome: str | None = None
    email: str
    whatsapp: str
    consent: bool
    look_id: int | None = None
    product_id: int | None = None
    product_nome: str | None = None
    look_nome: str | None = None
    tipo: str
    contatado: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class ClientContactCreate(BaseModel):
    whatsapp: str
    mensagem: str


class ClientContactResponse(BaseModel):
    id: int
    whatsapp: str
    mensagem: str
    created_at: datetime

    class Config:
        from_attributes = True
