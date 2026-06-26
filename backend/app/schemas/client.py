from datetime import datetime
from pydantic import BaseModel, field_validator


class ClientCreate(BaseModel):
    nome: str
    whatsapp: str
    consent_whatsapp: bool = True
    origem: str = "local"

    @field_validator('nome')
    @classmethod
    def validate_nome(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("O nome é obrigatório.")
        return v.strip()

    @field_validator('whatsapp')
    @classmethod
    def validate_whatsapp(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("O WhatsApp é obrigatório.")
        return v.strip()


class ClientResponse(BaseModel):
    id: int
    nome: str
    whatsapp: str
    consent_whatsapp: bool
    origem: str
    possui_lead_pendente: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ClientUpdate(BaseModel):
    nome: str | None = None
    whatsapp: str | None = None
    consent_whatsapp: bool | None = None
    origem: str | None = None

    @field_validator('nome')
    @classmethod
    def validate_nome(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("O nome não pode ser vazio.")
        return v.strip() if v is not None else None

    @field_validator('whatsapp')
    @classmethod
    def validate_whatsapp(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("O WhatsApp não pode ser vazio.")
        return v.strip() if v is not None else None
