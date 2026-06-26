from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String
from app.core.database import Base

class ClientContactHistory(Base):
    __tablename__ = "client_contact_histories"

    id = Column(Integer, primary_key=True, index=True)
    whatsapp = Column(String(20), nullable=False, index=True)
    mensagem = Column(String(1000), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

