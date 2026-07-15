from sqlalchemy import Boolean, Column, Integer, String, UniqueConstraint

from app.core.database import Base


class VariationOption(Base):
    """Pre-cadastro de variacoes (cores/tamanhos). Lista padrao que o operador
    escolhe ao cadastrar um produto — continua opcional. Nao afeta estoque/venda."""

    __tablename__ = "variation_options"

    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String(10), nullable=False, index=True)  # "cor" | "tamanho"
    valor = Column(String(50), nullable=False)
    ordem = Column(Integer, nullable=False, default=0)
    ativo = Column(Boolean, nullable=False, default=True)

    __table_args__ = (
        UniqueConstraint("tipo", "valor", name="uq_variation_option_tipo_valor"),
    )
