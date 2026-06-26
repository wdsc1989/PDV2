from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text

from app.core.database import Base


class Look(Base):
    __tablename__ = "looks"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(200), nullable=False)
    imagem_path = Column(String(255), nullable=False)
    prompt = Column(Text, nullable=True)
    source_product_ids = Column(Text, nullable=True)  # JSON com os ids dos produtos usados
    opcoes = Column(Text, nullable=True)  # JSON com pose/opções da geração
    publicado = Column(Boolean, nullable=False, default=False)
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
