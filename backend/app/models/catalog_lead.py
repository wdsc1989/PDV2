from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class CatalogLead(Base):
    __tablename__ = "catalog_leads"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=True)
    email = Column(String(100), nullable=False)
    whatsapp = Column(String(20), nullable=False)
    consent = Column(Boolean, nullable=False, default=True)
    look_id = Column(Integer, nullable=True)
    product_id = Column(Integer, nullable=True)
    tipo = Column(String(20), nullable=False)  # 'novidades', 'look' ou 'produto'
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    contatado = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    client = relationship("Client")
