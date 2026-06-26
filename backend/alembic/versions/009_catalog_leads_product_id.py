"""add product_id to catalog_leads

Revision ID: 009
Revises: 008
Create Date: 2026-06-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "009"
down_revision: Union[str, None] = "008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "catalog_leads",
        sa.Column("product_id", sa.Integer(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("catalog_leads", "product_id")
