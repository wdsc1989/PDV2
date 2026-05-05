"""
Seed para testes do PDV2: cadastra ao menos 100 categorias, 100 produtos e 100 vendas.
Execute a partir da raiz do backend: python scripts/seed_data.py
"""
import random
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

# Garante que o backend esteja no path para imports app.*
_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from app.core.database import SessionLocal, Base, engine
from app.models.product_category import ProductCategory
from app.models.product import Product
from app.models.cash_session import CashSession
from app.models.sale import Sale, SaleItem


def ensure_tables():
    """Cria tabelas se não existirem (útil para ambiente de teste)."""
    Base.metadata.create_all(bind=engine)


def seed_categories(db, count: int = 100):
    """Cria categorias com nomes únicos."""
    existing = {c.nome for c in db.query(ProductCategory).all()}
    to_create = []
    for i in range(1, count + 1):
        nome = f"Categoria {i:03d}"
        if nome in existing:
            continue
        to_create.append(
            ProductCategory(
                nome=nome,
                descricao=f"Descrição da categoria {i}",
                ativo=True,
            )
        )
        existing.add(nome)
    if to_create:
        db.add_all(to_create)
        db.commit()
        print(f"Categorias: {len(to_create)} criadas (total considerado: {count}).")
    else:
        print(f"Categorias: já existem pelo menos {count}.")
    return db.query(ProductCategory).all()


def seed_products(db, categories: list, count: int = 100):
    """Cria produtos com código único, ligados a categorias."""
    existing_codigos = {p.codigo for p in db.query(Product.codigo).all()}
    to_create = []
    for i in range(1, count + 1):
        codigo = f"PROD-{i:04d}"
        if codigo in existing_codigos:
            continue
        cat = random.choice(categories) if categories else None
        custo = round(random.uniform(5.0, 80.0), 2)
        margem = round(random.uniform(1.2, 2.5), 2)
        venda = round(custo * margem, 2)
        estoque = random.randint(20, 200)
        to_create.append(
            Product(
                codigo=codigo,
                nome=f"Produto {i}",
                categoria=cat.nome if cat else None,
                categoria_id=cat.id if cat else None,
                marca=random.choice(["Marca A", "Marca B", "Marca C", "Genérico"]) if random.random() > 0.3 else None,
                preco_custo=custo,
                preco_venda=venda,
                estoque_atual=float(estoque),
                estoque_minimo=5.0,
                ativo=True,
            )
        )
        existing_codigos.add(codigo)
    if to_create:
        db.add_all(to_create)
        db.commit()
        print(f"Produtos: {len(to_create)} criados (total considerado: {count}).")
    else:
        print(f"Produtos: já existem pelo menos {count}.")
    return db.query(Product).all()


def seed_cash_sessions_and_sales(db, products: list, num_sales: int = 100):
    """Cria sessões de caixa fechadas e vendas com itens."""
    if not products:
        print("Nenhum produto para criar vendas.")
        return

    # Sessões de caixa fechadas nos últimos 60 dias (uma por dia com vendas)
    hoje = date.today()
    sessions_by_date = {}
    for d in range(60):
        dth = hoje - timedelta(days=d)
        sess = CashSession(
            data_abertura=datetime.combine(dth, datetime.min.time()),
            data_fechamento=datetime.combine(dth, datetime.min.time().replace(hour=20, minute=0)),
            valor_abertura=100.0,
            valor_fechamento=500.0 + random.random() * 2000,
            status="fechada",
            observacao="Sessão de teste",
        )
        db.add(sess)
        db.flush()
        sessions_by_date[dth] = sess

    db.commit()
    # Refresh para ter id
    for s in sessions_by_date.values():
        db.refresh(s)

    # Criar vendas: distribuir num_sales pelos dias
    sales_created = 0
    for i in range(num_sales):
        products_with_stock = [p for p in products if (p.estoque_atual or 0) > 0]
        if not products_with_stock:
            break
        day_offset = random.randint(0, 59)
        data_venda = hoje - timedelta(days=day_offset)
        sess = sessions_by_date.get(data_venda)
        if not sess:
            continue

        num_itens = random.randint(1, 4)
        chosen = random.sample(products_with_stock, min(num_itens, len(products_with_stock)))
        total_vendido = 0.0
        total_lucro = 0.0
        total_pecas = 0
        itens_data = []

        for prod in chosen:
            available = max(0, int(prod.estoque_atual or 0))
            qty = random.randint(1, max(1, min(5, available)))
            preco_unit = prod.preco_venda
            custo_unit = prod.preco_custo
            subtotal = round(preco_unit * qty, 2)
            lucro_item = round((preco_unit - custo_unit) * qty, 2)
            total_vendido += subtotal
            total_lucro += lucro_item
            total_pecas += qty
            itens_data.append((prod, qty, preco_unit, custo_unit, subtotal, lucro_item))

        venda = Sale(
            cash_session_id=sess.id,
            data_venda=data_venda,
            total_vendido=round(total_vendido, 2),
            total_lucro=round(total_lucro, 2),
            total_pecas=total_pecas,
            tipo_pagamento=random.choice(["dinheiro", "cartao", "pix"]),
            status="concluida",
        )
        db.add(venda)
        db.flush()

        for prod, qty, preco_unit, custo_unit, subtotal, lucro_item in itens_data:
            db.add(
                SaleItem(
                    sale_id=venda.id,
                    product_id=prod.id,
                    quantidade=float(qty),
                    preco_unitario=preco_unit,
                    preco_custo_unitario=custo_unit,
                    subtotal=subtotal,
                    lucro_item=lucro_item,
                )
            )
            # Atualiza estoque
            prod.estoque_atual = (prod.estoque_atual or 0) - qty

        sales_created += 1

    db.commit()
    print(f"Vendas: {sales_created} criadas (sessões de caixa: {len(sessions_by_date)}).")


def main():
    ensure_tables()
    db = SessionLocal()
    try:
        categories = seed_categories(db, count=100)
        products = seed_products(db, categories, count=100)
        seed_cash_sessions_and_sales(db, products, num_sales=100)
        print("Seed concluído: 100+ categorias, 100+ produtos, 100+ vendas.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
