"""system settings config

Revision ID: 007
Revises: 006
Create Date: 2026-06-22

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "system_settings",
        sa.Column("key", sa.String(length=50), primary_key=True),
        sa.Column("value", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_system_settings_key", "system_settings", ["key"])
    
    # Seeding dos valores padrão
    op.execute(
        "INSERT INTO system_settings (key, value) VALUES "
        "('store_name', 'Vieira Closet Boutique'), "
        "('logo_path', '/uploads/logo.png')"
    )


def downgrade() -> None:
    op.drop_index("ix_system_settings_key", table_name="system_settings")
    op.drop_table("system_settings")
