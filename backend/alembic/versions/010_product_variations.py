"""product variations: cores and tamanhos (optional, informativas)

Revision ID: 010
Revises: 3ae4b7c8df9e
Create Date: 2026-07-15

Aditiva: duas colunas JSON opcionais em products (listas de cores e tamanhos
disponiveis). So informam o catalogo — nao afetam estoque nem venda. Linhas
existentes ficam NULL (tratado como "sem variacao").
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "010"
down_revision: Union[str, None] = "3ae4b7c8df9e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("products", sa.Column("cores", sa.JSON(), nullable=True))
    op.add_column("products", sa.Column("tamanhos", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("products", "tamanhos")
    op.drop_column("products", "cores")
