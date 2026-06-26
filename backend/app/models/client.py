from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String, Boolean
from app.core.database import Base


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    whatsapp = Column(String(20), nullable=False, unique=True, index=True)
    consent_whatsapp = Column(Boolean, nullable=False, default=True)
    origem = Column(String(20), nullable=False, default="local")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
