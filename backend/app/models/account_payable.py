from datetime import date, datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Float, Integer, String

from app.core.database import Base


class AccountPayable(Base):
    __tablename__ = "accounts_payable"

    id = Column(Integer, primary_key=True, index=True)
    fornecedor = Column(String(200), nullable=False)
    descricao = Column(String(255), nullable=True)
    data_vencimento = Column(Date, nullable=False)
    data_pagamento = Column(Date, nullable=True)
    valor = Column(Float, nullable=False, default=0.0)
    status = Column(String(20), nullable=False, default="aberta")
    observacao = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def update_status(self):
        hoje = date.today()
        if self.data_pagamento:
            self.status = "paga"
        elif self.data_vencimento < hoje:
            self.status = "atrasada"
        else:
            self.status = "aberta"
