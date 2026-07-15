"""pre-cadastro de variacoes: variation_options (cores/tamanhos)

Revision ID: 011
Revises: 010
Create Date: 2026-07-15

Aditiva: tabela nova com a lista padrao de cores/tamanhos que o operador escolhe
ao cadastrar um produto. So informativa. Seed com tamanhos comuns e algumas cores
de exemplo (todas editaveis/removiveis pela loja).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "011"
down_revision: Union[str, None] = "010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "variation_options",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("tipo", sa.String(length=10), nullable=False),
        sa.Column("valor", sa.String(length=50), nullable=False),
        sa.Column("ordem", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("ativo", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.UniqueConstraint("tipo", "valor", name="uq_variation_option_tipo_valor"),
    )
    op.create_index("ix_variation_options_tipo", "variation_options", ["tipo"])

    # seed inicial (a loja edita/remove depois)
    tabela = sa.table(
        "variation_options",
        sa.column("tipo", sa.String),
        sa.column("valor", sa.String),
        sa.column("ordem", sa.Integer),
    )
    tamanhos = ["PP", "P", "M", "G", "GG", "XG", "U"]
    cores = ["Preto", "Branco", "Bege", "Off White", "Vermelho", "Azul"]
    linhas = [{"tipo": "tamanho", "valor": v, "ordem": i} for i, v in enumerate(tamanhos)]
    linhas += [{"tipo": "cor", "valor": v, "ordem": i} for i, v in enumerate(cores)]
    op.bulk_insert(tabela, linhas)


def downgrade() -> None:
    op.drop_index("ix_variation_options_tipo", table_name="variation_options")
    op.drop_table("variation_options")
