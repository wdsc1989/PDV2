from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class StockAdjustment(Base):
    __tablename__ = "stock_adjustments"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    quantidade_anterior = Column(Float, nullable=False)
    quantidade_nova = Column(Float, nullable=False)
    diferenca = Column(Float, nullable=False)
    motivo = Column(String(50), nullable=False)  # ex: inventario, perda_avaria, brinde_consumo, outros
    observacao = Column(String(200), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    product = relationship("Product", backref="stock_adjustments")
    user = relationship("User", backref="stock_adjustments")
