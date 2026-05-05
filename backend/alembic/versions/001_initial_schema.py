"""Initial schema (users, product_categories, products, stock_entries, cash_sessions, sales, sale_items, accounts_payable, accounts_receivable, accessory_*, ai_config).

Revision ID: 001
Revises:
Create Date: 2025-03-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(50), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("signo", sa.String(20), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    op.create_table(
        "product_categories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nome", sa.String(100), nullable=False),
        sa.Column("descricao", sa.String(255), nullable=True),
        sa.Column("ativo", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_product_categories_id", "product_categories", ["id"])
    op.create_index("ix_product_categories_nome", "product_categories", ["nome"], unique=True)

    op.create_table(
        "products",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("codigo", sa.String(50), nullable=False),
        sa.Column("nome", sa.String(200), nullable=False),
        sa.Column("categoria", sa.String(100), nullable=True),
        sa.Column("marca", sa.String(100), nullable=True),
        sa.Column("preco_custo", sa.Float(), nullable=False),
        sa.Column("preco_venda", sa.Float(), nullable=False),
        sa.Column("estoque_atual", sa.Float(), nullable=False),
        sa.Column("estoque_minimo", sa.Float(), nullable=True),
        sa.Column("imagem_path", sa.String(255), nullable=True),
        sa.Column("ativo", sa.Boolean(), nullable=False),
        sa.Column("categoria_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["categoria_id"], ["product_categories.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_products_id", "products", ["id"])
    op.create_index("ix_products_codigo", "products", ["codigo"], unique=True)
    op.create_index("ix_products_categoria_id", "products", ["categoria_id"])

    op.create_table(
        "cash_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("data_abertura", sa.DateTime(), nullable=False),
        sa.Column("data_fechamento", sa.DateTime(), nullable=True),
        sa.Column("valor_abertura", sa.Float(), nullable=False),
        sa.Column("valor_fechamento", sa.Float(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("observacao", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_cash_sessions_id", "cash_sessions", ["id"])

    op.create_table(
        "sales",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("cash_session_id", sa.Integer(), nullable=False),
        sa.Column("data_venda", sa.Date(), nullable=False),
        sa.Column("total_vendido", sa.Float(), nullable=False),
        sa.Column("total_lucro", sa.Float(), nullable=False),
        sa.Column("total_pecas", sa.Integer(), nullable=False),
        sa.Column("tipo_pagamento", sa.String(20), nullable=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["cash_session_id"], ["cash_sessions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_sales_id", "sales", ["id"])
    op.create_index("ix_sales_cash_session_id", "sales", ["cash_session_id"])

    op.create_table(
        "sale_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("sale_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("quantidade", sa.Float(), nullable=False),
        sa.Column("preco_unitario", sa.Float(), nullable=False),
        sa.Column("preco_custo_unitario", sa.Float(), nullable=False),
        sa.Column("subtotal", sa.Float(), nullable=False),
        sa.Column("lucro_item", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["sale_id"], ["sales.id"]),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_sale_items_id", "sale_items", ["id"])
    op.create_index("ix_sale_items_sale_id", "sale_items", ["sale_id"])
    op.create_index("ix_sale_items_product_id", "sale_items", ["product_id"])

    op.create_table(
        "stock_entries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("data_entrada", sa.Date(), nullable=False),
        sa.Column("observacao", sa.String(200), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_stock_entries_id", "stock_entries", ["id"])
    op.create_index("ix_stock_entries_product_id", "stock_entries", ["product_id"])
    op.create_index("ix_stock_entries_data_entrada", "stock_entries", ["data_entrada"])

    op.create_table(
        "accounts_payable",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("fornecedor", sa.String(200), nullable=False),
        sa.Column("descricao", sa.String(255), nullable=True),
        sa.Column("data_vencimento", sa.Date(), nullable=False),
        sa.Column("data_pagamento", sa.Date(), nullable=True),
        sa.Column("valor", sa.Float(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("observacao", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_accounts_payable_id", "accounts_payable", ["id"])

    op.create_table(
        "accounts_receivable",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("cliente", sa.String(200), nullable=False),
        sa.Column("descricao", sa.String(255), nullable=True),
        sa.Column("data_vencimento", sa.Date(), nullable=False),
        sa.Column("data_recebimento", sa.Date(), nullable=True),
        sa.Column("valor", sa.Float(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("observacao", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_accounts_receivable_id", "accounts_receivable", ["id"])

    op.create_table(
        "accessory_stock",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("preco", sa.Float(), nullable=False),
        sa.Column("quantidade", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_accessory_stock_id", "accessory_stock", ["id"])
    op.create_index("ix_accessory_stock_preco", "accessory_stock", ["preco"], unique=True)

    op.create_table(
        "accessory_sales",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("data_venda", sa.Date(), nullable=False),
        sa.Column("preco", sa.Float(), nullable=False),
        sa.Column("quantidade", sa.Float(), nullable=False),
        sa.Column("repasse_feito", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_accessory_sales_id", "accessory_sales", ["id"])
    op.create_index("ix_accessory_sales_data_venda", "accessory_sales", ["data_venda"])

    op.create_table(
        "accessory_stock_entries",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("data_entrada", sa.Date(), nullable=False),
        sa.Column("preco", sa.Float(), nullable=False),
        sa.Column("quantidade", sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_accessory_stock_entries_id", "accessory_stock_entries", ["id"])
    op.create_index("ix_accessory_stock_entries_data_entrada", "accessory_stock_entries", ["data_entrada"])

    op.create_table(
        "ai_config",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(50), nullable=False),
        sa.Column("api_key", sa.Text(), nullable=True),
        sa.Column("model", sa.String(100), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("base_url", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ai_config_id", "ai_config", ["id"])


def downgrade() -> None:
    op.drop_table("ai_config")
    op.drop_table("accessory_stock_entries")
    op.drop_table("accessory_sales")
    op.drop_table("accessory_stock")
    op.drop_table("accounts_receivable")
    op.drop_table("accounts_payable")
    op.drop_table("stock_entries")
    op.drop_table("sale_items")
    op.drop_table("sales")
    op.drop_table("cash_sessions")
    op.drop_table("products")
    op.drop_table("product_categories")
    op.drop_table("users")
