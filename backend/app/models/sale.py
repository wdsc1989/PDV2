from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    cash_session_id = Column(Integer, ForeignKey("cash_sessions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    data_venda = Column(Date, nullable=False)
    subtotal_bruto = Column(Float, nullable=False, default=0.0)
    desconto_tipo = Column(String(20), nullable=True)  # "percentual" | "valor"
    desconto_input = Column(Float, nullable=True)  # valor digitado (% ou R$)
    desconto_valor = Column(Float, nullable=False, default=0.0)  # desconto em R$
    total_vendido = Column(Float, nullable=False, default=0.0)  # líquido (bruto - desconto)
    total_lucro = Column(Float, nullable=False, default=0.0)
    total_pecas = Column(Integer, nullable=False, default=0)
    comissao_percentual = Column(Float, nullable=False, default=0.0)  # snapshot
    comissao_valor = Column(Float, nullable=False, default=0.0)
    comissao_paga = Column(Boolean, default=False, nullable=False)
    tipo_pagamento = Column(String(20), nullable=True)
    status = Column(String(20), nullable=False, default="concluida")
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    cash_session = relationship("CashSession")
    user = relationship("User")
    client = relationship("Client")
    itens = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")


class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantidade = Column(Float, nullable=False, default=1.0)
    preco_unitario = Column(Float, nullable=False, default=0.0)
    preco_custo_unitario = Column(Float, nullable=False, default=0.0)
    subtotal = Column(Float, nullable=False, default=0.0)
    lucro_item = Column(Float, nullable=False, default=0.0)

    sale = relationship("Sale", back_populates="itens")
    product = relationship("Product")
