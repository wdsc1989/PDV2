"""looks publicado e catalog leads

Revision ID: 006
Revises: 005
Create Date: 2026-06-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Adicionar looks.publicado
    op.add_column(
        "looks",
        sa.Column("publicado", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    
    # 2. Criar catalog_leads
    op.create_table(
        "catalog_leads",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("nome", sa.String(length=100), nullable=True),
        sa.Column("email", sa.String(length=100), nullable=False),
        sa.Column("whatsapp", sa.String(length=20), nullable=False),
        sa.Column("consent", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("look_id", sa.Integer(), nullable=True),
        sa.Column("tipo", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_catalog_leads_id", "catalog_leads", ["id"])


def downgrade() -> None:
    op.drop_index("ix_catalog_leads_id", table_name="catalog_leads")
    op.drop_table("catalog_leads")
    op.drop_column("looks", "publicado")
