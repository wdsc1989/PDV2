"""Custo na entrada de estoque (CMP): stock_entries.preco_custo_unitario.

A entrada de estoque passa a registrar o custo unitário daquele lote; o
custo do produto (products.preco_custo) vira média ponderada recalculada
a cada entrada. SaleItem.preco_custo_unitario segue sendo a verdade
histórica do custo no momento da venda.

Revision ID: 002
Revises: 001
Create Date: 2026-06-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "stock_entries",
        sa.Column("preco_custo_unitario", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("stock_entries", "preco_custo_unitario")
