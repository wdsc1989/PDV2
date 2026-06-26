from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.user import User
from app.models.cash_session import CashSession
from app.models.sale import Sale, SaleItem
from app.models.product import Product
from app.schemas.sale import SaleCreate, SaleResponse, SaleItemResponse, SaleItemCreate

router = APIRouter()


def _get_open_session(db: Session) -> CashSession | None:
    return db.query(CashSession).filter(CashSession.status == "aberta").first()


def _sale_for_role(sale: Sale, role: str) -> SaleResponse:
    """Monta a resposta com nome do produto; vendedor não enxerga lucro nem custo."""
    resp = SaleResponse.model_validate(sale)
    for item_resp, item_orm in zip(resp.itens, sale.itens):
        item_resp.product_nome = item_orm.product.nome if item_orm.product else None
    if role == "vendedor":
        resp.total_lucro = None
        for item in resp.itens:
            item.preco_custo_unitario = None
            item.lucro_item = None
    return resp


@router.post("/", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
def create_sale(
    body: SaleCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente", "vendedor"])),
):
    cash = _get_open_session(db)
    if not cash:
        raise HTTPException(status_code=400, detail="No open cash session. Open cash first.")
    total_vendido = 0.0
    total_lucro = 0.0
    total_pecas = 0
    itens_to_create = []
    for item in body.itens:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        if product.estoque_atual < item.quantidade:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for product {product.nome} (has {product.estoque_atual})",
            )
        subtotal = item.quantidade * item.preco_unitario
        lucro_item = item.quantidade * (item.preco_unitario - item.preco_custo_unitario)
        total_vendido += subtotal
        total_lucro += lucro_item
        total_pecas += int(item.quantidade)
        itens_to_create.append(
            {
                "product_id": item.product_id,
                "quantidade": item.quantidade,
                "preco_unitario": item.preco_unitario,
                "preco_custo_unitario": item.preco_custo_unitario,
                "subtotal": subtotal,
                "lucro_item": lucro_item,
                "product": product,
            }
        )
    # Desconto aplicado ao total da venda (percentual padrão ou valor em R$).
    subtotal_bruto = total_vendido
    desconto_valor = 0.0
    if body.desconto_input and body.desconto_input > 0:
        if body.desconto_tipo == "percentual":
            desconto_valor = subtotal_bruto * (body.desconto_input / 100.0)
        else:  # "valor"
            desconto_valor = body.desconto_input
        # nunca descontar mais que o próprio bruto
        desconto_valor = max(0.0, min(desconto_valor, subtotal_bruto))
    total_vendido = subtotal_bruto - desconto_valor
    total_lucro = total_lucro - desconto_valor  # o desconto sai do lucro

    comissao_percentual = user.comissao_percentual or 0.0
    comissao_valor = total_vendido * (comissao_percentual / 100.0)

    sale = Sale(
        cash_session_id=cash.id,
        user_id=user.id,
        data_venda=date.today(),
        subtotal_bruto=subtotal_bruto,
        desconto_tipo=body.desconto_tipo if desconto_valor > 0 else None,
        desconto_input=body.desconto_input if desconto_valor > 0 else None,
        desconto_valor=desconto_valor,
        total_vendido=total_vendido,
        total_lucro=total_lucro,
        total_pecas=total_pecas,
        comissao_percentual=comissao_percentual,
        comissao_valor=comissao_valor,
        tipo_pagamento=body.tipo_pagamento,
        status="concluida",
        client_id=body.client_id,
    )
    db.add(sale)
    db.flush()
    for row in itens_to_create:
        product = row["product"]
        product.estoque_atual -= row["quantidade"]
        si = SaleItem(
            sale_id=sale.id,
            product_id=row["product_id"],
            quantidade=row["quantidade"],
            preco_unitario=row["preco_unitario"],
            preco_custo_unitario=row["preco_custo_unitario"],
            subtotal=row["subtotal"],
            lucro_item=row["lucro_item"],
        )
        db.add(si)
    db.commit()
    db.refresh(sale)
    return sale


@router.get("/", response_model=list[SaleResponse])
def list_sales(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    cash_session_id: int | None = None,
    skip: int = 0,
    limit: int = 100,
):
    query = db.query(Sale)
    if cash_session_id is not None:
        query = query.filter(Sale.cash_session_id == cash_session_id)
    sales = query.order_by(Sale.id.desc()).offset(skip).limit(limit).all()
    return [_sale_for_role(s, user.role) for s in sales]


@router.get("/{sale_id}", response_model=SaleResponse)
def get_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    return _sale_for_role(sale, user.role)


class SaleUpdate(BaseModel):
    status: str | None = None
    tipo_pagamento: str | None = None
    desconto_tipo: str | None = None  # "percentual" | "valor"
    desconto_input: float | None = None
    created_at: datetime | None = None
    user_id: int | None = None
    itens: list[SaleItemCreate] | None = None


@router.patch("/{sale_id}", response_model=SaleResponse)
def update_sale(
    sale_id: int,
    body: SaleUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente"])),
):
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")

    is_structural_edit = (
        body.tipo_pagamento is not None or
        body.desconto_tipo is not None or
        body.desconto_input is not None or
        body.created_at is not None or
        body.user_id is not None or
        body.itens is not None
    )

    if is_structural_edit and user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Apenas o administrador do sistema pode editar vendas finalizadas."
        )

    # 1. Cancelamento / Estorno
    if body.status == "cancelada":
        if sale.status == "cancelada":
            raise HTTPException(status_code=400, detail="Sale already cancelled")
        for item in sale.itens:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                product.estoque_atual += item.quantidade
        sale.status = "cancelada"
        db.commit()
        db.refresh(sale)
        return _sale_for_role(sale, user.role)

    # 2. Edição Estrutural
    if is_structural_edit:
        if sale.status == "cancelada":
            raise HTTPException(status_code=400, detail="Não é possível editar uma venda cancelada.")

        # Atualizar vendedor (user_id)
        if body.user_id is not None:
            vendedor = db.query(User).filter(User.id == body.user_id).first()
            if not vendedor:
                raise HTTPException(status_code=404, detail="Vendedor não encontrado")
            sale.user_id = body.user_id
            sale.comissao_percentual = vendedor.comissao_percentual or 0.0

        # Atualizar data/hora
        if body.created_at is not None:
            sale.created_at = body.created_at
            sale.data_venda = body.created_at.date()

        # Atualizar tipo de pagamento
        if body.tipo_pagamento is not None:
            sale.tipo_pagamento = body.tipo_pagamento

        # Atualizar itens e estoque
        if body.itens is not None:
            stock_diff = {}
            for item in sale.itens:
                stock_diff[item.product_id] = stock_diff.get(item.product_id, 0.0) + item.quantidade
            for new_item in body.itens:
                stock_diff[new_item.product_id] = stock_diff.get(new_item.product_id, 0.0) - new_item.quantidade

            for prod_id, diff in stock_diff.items():
                if diff < 0:
                    product = db.query(Product).filter(Product.id == prod_id).first()
                    if not product:
                        raise HTTPException(status_code=404, detail=f"Produto {prod_id} não encontrado")
                    if product.estoque_atual + diff < 0:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Estoque insuficiente para {product.nome} (disponível: {product.estoque_atual + diff + next(x.quantidade for x in body.itens if x.product_id == prod_id)})"
                        )

            # Devolver estoque anterior
            for item in sale.itens:
                product = db.query(Product).filter(Product.id == item.product_id).first()
                if product:
                    product.estoque_atual += item.quantidade

            sale.itens.clear()

            total_itens_vendido = 0.0
            total_lucro_itens = 0.0
            total_pecas = 0
            for new_item in body.itens:
                product = db.query(Product).filter(Product.id == new_item.product_id).first()
                if product:
                    product.estoque_atual -= new_item.quantidade

                subtotal = new_item.quantidade * new_item.preco_unitario
                lucro_item = new_item.quantidade * (new_item.preco_unitario - new_item.preco_custo_unitario)

                total_itens_vendido += subtotal
                total_lucro_itens += lucro_item
                total_pecas += int(new_item.quantidade)

                si = SaleItem(
                    product_id=new_item.product_id,
                    quantidade=new_item.quantidade,
                    preco_unitario=new_item.preco_unitario,
                    preco_custo_unitario=new_item.preco_custo_unitario,
                    subtotal=subtotal,
                    lucro_item=lucro_item,
                )
                sale.itens.append(si)

            sale.subtotal_bruto = total_itens_vendido
            sale.total_pecas = total_pecas

        # Desconto
        desc_tipo = body.desconto_tipo if body.desconto_tipo is not None else sale.desconto_tipo
        desc_input = body.desconto_input if body.desconto_input is not None else sale.desconto_input

        desconto_valor = 0.0
        if desc_input and desc_input > 0:
            if desc_tipo == "percentual":
                desconto_valor = sale.subtotal_bruto * (desc_input / 100.0)
            else:
                desconto_valor = desc_input
            desconto_valor = max(0.0, min(desconto_valor, sale.subtotal_bruto))

        sale.desconto_tipo = desc_tipo if desconto_valor > 0 else None
        sale.desconto_input = desc_input if desconto_valor > 0 else None
        sale.desconto_valor = desconto_valor

        sale.total_vendido = sale.subtotal_bruto - desconto_valor

        total_lucro_bruto = sum(item.lucro_item for item in sale.itens)
        sale.total_lucro = total_lucro_bruto - desconto_valor

        # Comissão
        comissao_percentual = sale.comissao_percentual or 0.0
        sale.comissao_valor = sale.total_vendido * (comissao_percentual / 100.0)

        db.commit()
        db.refresh(sale)
        return _sale_for_role(sale, user.role)

    raise HTTPException(status_code=400, detail="Nenhum campo para atualização foi enviado.")

