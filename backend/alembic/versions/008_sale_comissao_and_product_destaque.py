"""add comissao_paga to sale and em_destaque to product

Revision ID: 008
Revises: 007
Create Date: 2026-06-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "008"
down_revision: Union[str, None] = "007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "sales",
        sa.Column("comissao_paga", sa.Boolean(), nullable=False, server_default=sa.text('false'))
    )
    op.add_column(
        "products",
        sa.Column("em_destaque", sa.Boolean(), nullable=False, server_default=sa.text('false'))
    )


def downgrade() -> None:
    op.drop_column("sales", "comissao_paga")
    op.drop_column("products", "em_destaque")
