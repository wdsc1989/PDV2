from sqlalchemy import Boolean, Column, Date, Float, Integer

from app.core.database import Base


class AccessoryStock(Base):
    __tablename__ = "accessory_stock"

    id = Column(Integer, primary_key=True, index=True)
    preco = Column(Float, nullable=False, unique=True, index=True)
    quantidade = Column(Float, nullable=False, default=0.0)


class AccessorySale(Base):
    __tablename__ = "accessory_sales"

    id = Column(Integer, primary_key=True, index=True)
    data_venda = Column(Date, nullable=False, index=True)
    preco = Column(Float, nullable=False)
    quantidade = Column(Float, nullable=False, default=0.0)
    repasse_feito = Column(Boolean, nullable=False, default=False)


class AccessoryStockEntry(Base):
    __tablename__ = "accessory_stock_entries"

    id = Column(Integer, primary_key=True, index=True)
    data_entrada = Column(Date, nullable=False, index=True)
    preco = Column(Float, nullable=False)
    quantidade = Column(Float, nullable=False, default=0.0)
