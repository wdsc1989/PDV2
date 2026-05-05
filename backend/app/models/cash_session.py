from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String

from app.core.database import Base


class CashSession(Base):
    __tablename__ = "cash_sessions"

    id = Column(Integer, primary_key=True, index=True)
    data_abertura = Column(DateTime, nullable=False, default=datetime.utcnow)
    data_fechamento = Column(DateTime, nullable=True)
    valor_abertura = Column(Float, nullable=False, default=0.0)
    valor_fechamento = Column(Float, nullable=True)
    status = Column(String(20), nullable=False, default="aberta")
    observacao = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
