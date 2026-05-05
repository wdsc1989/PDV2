from datetime import date, datetime as dt, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import Integer, func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.user import User
from app.models.cash_session import CashSession
from app.models.sale import Sale, SaleItem
from app.models.product import Product
from app.models.product_category import ProductCategory
from app.models.account_payable import AccountPayable
from app.models.account_receivable import AccountReceivable
from app.schemas.report import (
    ReportSummary,
    SalesByDayRow,
    SalesByCategoryRow,
    SalesByPaymentRow,
    TopProductRow,
    StockRow,
    SalesByHourRow,
)

router = APIRouter()


def _parse_period(
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    days: Optional[int] = None,
) -> tuple[date, date]:
    today = date.today()
    if data_inicio is not None and data_fim is not None:
        s = data_inicio.date() if isinstance(data_inicio, dt) else data_inicio
        e = data_fim.date() if isinstance(data_fim, dt) else data_fim
        return (s, e)
    d = days if days is not None else 30
    d = max(1, min(365, d))
    return today - timedelta(days=d), today


@router.get("/summary", response_model=ReportSummary)
def report_summary(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente", "vendedor"])),
    days: Optional[int] = Query(30, ge=1, le=365),
    data_inicio: Optional[date] = Query(None),
    data_fim: Optional[date] = Query(None),
):
    start, end = _parse_period(data_inicio, data_fim, days)
    today = date.today()

    caixa = db.query(CashSession).filter(CashSession.status == "aberta").first()

    vendas_hoje = (
        db.query(
            func.coalesce(func.sum(Sale.total_vendido), 0).label("total"),
            func.count(Sale.id).label("cnt"),
        )
        .filter(Sale.data_venda == today, Sale.status == "concluida")
        .first()
    )
    total_hoje = float(vendas_hoje[0]) if vendas_hoje else 0.0
    count_hoje = int(vendas_hoje[1]) if vendas_hoje and vendas_hoje[1] is not None else 0

    periodo = (
        db.query(
            func.coalesce(func.sum(Sale.total_vendido), 0).label("total"),
            func.coalesce(func.sum(Sale.total_lucro), 0).label("lucro"),
            func.count(Sale.id).label("cnt"),
        )
        .filter(Sale.data_venda >= start, Sale.data_venda <= end, Sale.status == "concluida")
        .first()
    )
    total_periodo = float(periodo[0]) if periodo and periodo[0] is not None else 0.0
    lucro_periodo = float(periodo[1]) if periodo and periodo[1] is not None else 0.0
    count_periodo = int(periodo[2]) if periodo and periodo[2] is not None else 0
    ticket_medio = (total_periodo / count_periodo) if count_periodo else 0.0

    contas_vencidas = (
        db.query(func.count(AccountPayable.id))
        .filter(AccountPayable.data_vencimento < today, AccountPayable.data_pagamento.is_(None))
        .scalar() or 0
    ) + (
        db.query(func.count(AccountReceivable.id))
        .filter(AccountReceivable.data_vencimento < today, AccountReceivable.data_recebimento.is_(None))
        .scalar() or 0
    )

    estoque = (
        db.query(
            func.coalesce(func.sum(Product.preco_custo * Product.estoque_atual), 0).label("custo"),
            func.coalesce(func.sum(Product.preco_venda * Product.estoque_atual), 0).label("venda"),
        )
        .filter(Product.ativo.is_(True))
        .first()
    )
    valor_estoque_custo = float(estoque[0]) if estoque and estoque[0] is not None else 0.0
    valor_estoque_venda = float(estoque[1]) if estoque and estoque[1] is not None else 0.0

    estoque_critico = (
        db.query(func.count(Product.id))
        .filter(
            Product.ativo.is_(True),
            Product.estoque_minimo.isnot(None),
            Product.estoque_atual <= Product.estoque_minimo,
        )
        .scalar() or 0
    )

    return ReportSummary(
        total_vendas_hoje=total_hoje,
        total_vendas_periodo=total_periodo,
        total_lucro_periodo=lucro_periodo,
        caixa_aberto=caixa is not None,
        vendas_count_hoje=count_hoje,
        vendas_count_periodo=count_periodo,
        ticket_medio_periodo=round(ticket_medio, 2),
        contas_vencidas_count=int(contas_vencidas),
        valor_estoque_custo=round(valor_estoque_custo, 2),
        valor_estoque_venda=round(valor_estoque_venda, 2),
        produtos_estoque_critico_count=int(estoque_critico),
    )


@router.get("/sales-by-day", response_model=list[SalesByDayRow])
def sales_by_day(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente", "vendedor"])),
    days: Optional[int] = Query(30, ge=1, le=365),
    data_inicio: Optional[date] = Query(None),
    data_fim: Optional[date] = Query(None),
):
    start, end = _parse_period(data_inicio, data_fim, days)
    rows = (
        db.query(
            Sale.data_venda.label("date"),
            func.coalesce(func.sum(Sale.total_vendido), 0).label("total"),
            func.count(Sale.id).label("count"),
        )
        .filter(Sale.data_venda >= start, Sale.data_venda <= end, Sale.status == "concluida")
        .group_by(Sale.data_venda)
        .order_by(Sale.data_venda)
        .all()
    )
    return [
        SalesByDayRow(date=r.date, total=float(r.total), count=int(r.count))
        for r in rows
    ]


@router.get("/sales-by-category", response_model=list[SalesByCategoryRow])
def sales_by_category(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente", "vendedor"])),
    days: Optional[int] = Query(30, ge=1, le=365),
    data_inicio: Optional[date] = Query(None),
    data_fim: Optional[date] = Query(None),
    categoria_id: Optional[int] = Query(None),
):
    start, end = _parse_period(data_inicio, data_fim, days)
    cat_label = func.coalesce(ProductCategory.nome, Product.categoria, "Sem categoria")
    q = (
        db.query(
            cat_label.label("cat"),
            func.coalesce(func.sum(SaleItem.subtotal), 0).label("total"),
            func.count(SaleItem.id).label("cnt"),
        )
        .select_from(SaleItem)
        .join(Product, SaleItem.product_id == Product.id)
        .join(Sale, Sale.id == SaleItem.sale_id)
        .outerjoin(ProductCategory, Product.categoria_id == ProductCategory.id)
        .filter(Sale.data_venda >= start, Sale.data_venda <= end, Sale.status == "concluida")
    )
    if isinstance(categoria_id, int):
        q = q.filter(Product.categoria_id == categoria_id)
    q = q.group_by(cat_label).order_by(func.sum(SaleItem.subtotal).desc())
    rows = q.all()
    return [
        SalesByCategoryRow(category_name=r.cat or "Sem categoria", total=float(r.total), count=int(r.cnt))
        for r in rows
    ]


@router.get("/sales-by-payment", response_model=list[SalesByPaymentRow])
def sales_by_payment(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente", "vendedor"])),
    days: Optional[int] = Query(30, ge=1, le=365),
    data_inicio: Optional[date] = Query(None),
    data_fim: Optional[date] = Query(None),
):
    start, end = _parse_period(data_inicio, data_fim, days)
    rows = (
        db.query(
            func.coalesce(Sale.tipo_pagamento, "não informado").label("tipo"),
            func.coalesce(func.sum(Sale.total_vendido), 0).label("total"),
            func.count(Sale.id).label("count"),
        )
        .filter(Sale.data_venda >= start, Sale.data_venda <= end, Sale.status == "concluida")
        .group_by(Sale.tipo_pagamento)
        .all()
    )
    return [
        SalesByPaymentRow(tipo_pagamento=r.tipo, total=float(r.total), count=int(r.count))
        for r in rows
    ]


@router.get("/top-products", response_model=list[TopProductRow])
def top_products(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente", "vendedor"])),
    days: Optional[int] = Query(30, ge=1, le=365),
    data_inicio: Optional[date] = Query(None),
    data_fim: Optional[date] = Query(None),
    limit: int = Query(10, ge=1, le=100),
):
    start, end = _parse_period(data_inicio, data_fim, days)
    rows = (
        db.query(
            Product.id.label("product_id"),
            Product.nome,
            func.coalesce(func.sum(SaleItem.quantidade), 0).label("qty"),
            func.coalesce(func.sum(SaleItem.subtotal), 0).label("valor"),
            func.coalesce(func.sum(SaleItem.lucro_item), 0).label("lucro"),
        )
        .join(SaleItem, SaleItem.product_id == Product.id)
        .join(Sale, Sale.id == SaleItem.sale_id)
        .filter(Sale.data_venda >= start, Sale.data_venda <= end, Sale.status == "concluida")
        .group_by(Product.id, Product.nome)
        .order_by(func.sum(SaleItem.quantidade).desc())
        .limit(limit)
        .all()
    )
    return [
        TopProductRow(
            product_id=r.product_id,
            nome=r.nome,
            quantidade_vendida=float(r.qty),
            valor_total=float(r.valor),
            lucro_total=float(r.lucro),
        )
        for r in rows
    ]


@router.get("/stock-summary", response_model=list[StockRow])
def stock_summary(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente", "vendedor"])),
    categoria_id: Optional[int] = Query(None),
):
    q = db.query(Product).filter(Product.ativo.is_(True))
    if isinstance(categoria_id, int):
        q = q.filter(Product.categoria_id == categoria_id)
    products = q.all()
    return [
        StockRow(
            product_id=p.id,
            nome=p.nome,
            quantidade=float(p.estoque_atual or 0),
            valor_custo_total=round((p.preco_custo or 0) * (p.estoque_atual or 0), 2),
            valor_venda_total=round((p.preco_venda or 0) * (p.estoque_atual or 0), 2),
            lucro_potencial=round(
                ((p.preco_venda or 0) - (p.preco_custo or 0)) * (p.estoque_atual or 0), 2
            ),
            abaixo_minimo=(
                p.estoque_minimo is not None and (p.estoque_atual or 0) <= p.estoque_minimo
            ),
        )
        for p in products
    ]


@router.get("/sales-by-hour", response_model=list[SalesByHourRow])
def sales_by_hour(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente", "vendedor"])),
    days: Optional[int] = Query(30, ge=1, le=365),
    data_inicio: Optional[date] = Query(None),
    data_fim: Optional[date] = Query(None),
):
    start, end = _parse_period(data_inicio, data_fim, days)
    start_dt = dt.combine(start, dt.min.time())
    end_dt = dt.combine(end, dt.max.time())
    hour_expr = func.cast(func.strftime("%H", Sale.created_at), Integer)
    rows = (
        db.query(
            hour_expr.label("hour"),
            func.count(Sale.id).label("count"),
            func.coalesce(func.sum(Sale.total_vendido), 0).label("total"),
        )
        .filter(Sale.created_at >= start_dt, Sale.created_at <= end_dt, Sale.status == "concluida")
        .group_by(hour_expr)
        .order_by(hour_expr)
        .all()
    )
    return [
        SalesByHourRow(hour=int(r.hour or 0), count=int(r.count), total=float(r.total))
        for r in rows
    ]
