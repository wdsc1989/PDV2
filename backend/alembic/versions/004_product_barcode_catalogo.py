"""Código de barras e visibilidade no catálogo do produto.

- products.codigo_barras: EAN/GTIN para etiqueta e leitura na venda
- products.no_catalogo: se o produto aparece na vitrine pública (default True)

Revision ID: 004
Revises: 003
Create Date: 2026-06-20

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("products", sa.Column("codigo_barras", sa.String(length=50), nullable=True))
    op.add_column("products", sa.Column("no_catalogo", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.create_index("ix_products_codigo_barras", "products", ["codigo_barras"])


def downgrade() -> None:
    op.drop_index("ix_products_codigo_barras", table_name="products")
    op.drop_column("products", "no_catalogo")
    op.drop_column("products", "codigo_barras")
