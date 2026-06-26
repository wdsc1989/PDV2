"""Tabela de looks gerados pela fal.ai.

Revision ID: 005
Revises: 004
Create Date: 2026-06-20

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "looks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nome", sa.String(length=200), nullable=False),
        sa.Column("imagem_path", sa.String(length=255), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=True),
        sa.Column("source_product_ids", sa.Text(), nullable=True),
        sa.Column("opcoes", sa.Text(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_looks_id", "looks", ["id"])


def downgrade() -> None:
    op.drop_index("ix_looks_id", table_name="looks")
    op.drop_table("looks")
