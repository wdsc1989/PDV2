from datetime import datetime

from sqlalchemy import JSON, Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    codigo_barras = Column(String(50), nullable=True, index=True)  # EAN/GTIN p/ etiqueta e leitor
    nome = Column(String(200), nullable=False)
    categoria = Column(String(100), nullable=True)
    marca = Column(String(100), nullable=True)
    preco_custo = Column(Float, nullable=False, default=0.0)
    preco_venda = Column(Float, nullable=False, default=0.0)
    estoque_atual = Column(Float, nullable=False, default=0.0)
    estoque_minimo = Column(Float, nullable=True)
    imagem_path = Column(String(255), nullable=True)
    # variacoes OPCIONAIS (loja de roupas): listas de cores/tamanhos disponiveis.
    # So informativas — nao afetam estoque nem venda; refletem no catalogo.
    cores = Column(JSON, nullable=True)      # ex: ["Preto", "Bege"]
    tamanhos = Column(JSON, nullable=True)   # ex: ["P", "M", "G"]
    no_catalogo = Column(Boolean, nullable=False, default=True)  # visível na vitrine pública
    em_destaque = Column(Boolean, nullable=False, default=False)  # visível na seção de destaques
    ativo = Column(Boolean, nullable=False, default=True)
    categoria_id = Column(Integer, ForeignKey("product_categories.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    categoria_rel = relationship("ProductCategory", lazy="joined")
