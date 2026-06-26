from datetime import date, datetime

from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class AccountReceivable(Base):
    __tablename__ = "accounts_receivable"

    id = Column(Integer, primary_key=True, index=True)
    cliente = Column(String(200), nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    descricao = Column(String(255), nullable=True)
    data_vencimento = Column(Date, nullable=False)
    data_recebimento = Column(Date, nullable=True)
    valor = Column(Float, nullable=False, default=0.0)
    status = Column(String(20), nullable=False, default="aberta")
    observacao = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    client = relationship("Client")

    def update_status(self):
        hoje = date.today()
        if self.data_recebimento:
            self.status = "recebida"
        elif self.data_vencimento < hoje:
            self.status = "atrasada"
        else:
            self.status = "aberta"
