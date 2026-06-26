"""Desconto na venda + comissão de vendedor.

Adiciona a `sales`:
- subtotal_bruto: soma dos itens antes do desconto (total_vendido passa a ser líquido)
- desconto_tipo ("percentual"/"valor") e desconto_input (valor digitado)
- desconto_valor: desconto já convertido em R$
- user_id: vendedor que registrou a venda (base da comissão) — sem FK no nível do
  banco (SQLite não suporta ALTER de constraint); a relação fica no ORM.
- comissao_percentual / comissao_valor: snapshot no momento da venda

Adiciona a `users`:
- comissao_percentual: % de comissão padrão do usuário

Revision ID: 003
Revises: 002
Create Date: 2026-06-20

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _cols(table: str) -> set[str]:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return {c["name"] for c in insp.get_columns(table)}


def _add(table: str, column: sa.Column) -> None:
    """Adiciona a coluna apenas se ainda não existir (tolera estado parcial)."""
    if column.name not in _cols(table):
        op.add_column(table, column)


def upgrade() -> None:
    _add("users", sa.Column("comissao_percentual", sa.Float(), nullable=False, server_default="0"))

    _add("sales", sa.Column("subtotal_bruto", sa.Float(), nullable=True))
    _add("sales", sa.Column("desconto_tipo", sa.String(length=20), nullable=True))
    _add("sales", sa.Column("desconto_input", sa.Float(), nullable=True))
    _add("sales", sa.Column("desconto_valor", sa.Float(), nullable=False, server_default="0"))
    _add("sales", sa.Column("user_id", sa.Integer(), nullable=True))
    _add("sales", sa.Column("comissao_percentual", sa.Float(), nullable=False, server_default="0"))
    _add("sales", sa.Column("comissao_valor", sa.Float(), nullable=False, server_default="0"))

    # Vendas antigas: subtotal bruto = total já registrado (sem desconto).
    op.execute("UPDATE sales SET subtotal_bruto = total_vendido WHERE subtotal_bruto IS NULL")


def downgrade() -> None:
    for col in ("comissao_valor", "comissao_percentual", "user_id", "desconto_valor",
                "desconto_input", "desconto_tipo", "subtotal_bruto"):
        if col in _cols("sales"):
            op.drop_column("sales", col)
    if "comissao_percentual" in _cols("users"):
        op.drop_column("users", "comissao_percentual")
