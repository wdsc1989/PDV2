from datetime import datetime

from pydantic import BaseModel


class LookCreate(BaseModel):
    nome: str
    superior_id: int | None = None
    inferior_id: int | None = None
    conjunto_id: int | None = None
    pose: str | None = None  # ex.: "em pé, corpo inteiro", "andando"
    tamanho: str | None = None  # P, M, G, GG, PLUSIZE
    caimento: str | None = None  # caimento/ajuste da roupa no corpo
    extra_prompt: str | None = None


class LookPieceResponse(BaseModel):
    id: int
    nome: str
    papel: str
    preco_venda: float
    imagem_path: str | None = None
    em_destaque: bool = False
    categoria: str | None = None
    marca: str | None = None
    estoque_atual: float = 0.0


class LookResponse(BaseModel):
    id: int
    nome: str
    imagem_path: str
    prompt: str | None = None
    publicado: bool = False
    created_at: datetime
    pieces: list[LookPieceResponse] = []
    valor_total: float = 0.0
    opcoes: str | None = None

    class Config:
        from_attributes = True
