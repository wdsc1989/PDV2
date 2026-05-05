from __future__ import annotations

import json
import re
from calendar import monthrange
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Tuple

from dateutil.relativedelta import relativedelta
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.account_payable import AccountPayable
from app.models.account_receivable import AccountReceivable
from app.models.cash_session import CashSession
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.models.stock_entry import StockEntry
from app.services.ai_service import AIService


class ReportAgentService:
    """
    Report agent for PDV2: analyzes a natural-language question with IA,
    runs database queries via ORM and returns structured data plus, when needed,
    a natural-language answer.
    """

    def __init__(self, db: Session):
        self.db = db
        self.ai_service = AIService(db)

    # ---------------------- Public API ---------------------- #

    def get_initial_analysis(self, db: Session) -> str:
        """
        Simple initial daily summary used when opening the agent UI.
        """
        today = date.today()
        vendas = (
            db.query(
                func.coalesce(func.sum(Sale.total_vendido), 0.0),
                func.coalesce(func.sum(Sale.total_lucro), 0.0),
                func.coalesce(func.count(Sale.id), 0),
            )
            .filter(Sale.data_venda == today)
            .filter(Sale.status != "cancelada")
            .one()
        )
        total_vendido_hoje = float(vendas[0])
        total_lucro_hoje = float(vendas[1])
        num_vendas_hoje = int(vendas[2] or 0)

        estoque_baixo = (
            db.query(func.count(Product.id))
            .filter(Product.ativo.is_(True))
            .filter(Product.estoque_minimo.isnot(None))
            .filter(Product.estoque_atual <= Product.estoque_minimo)
            .scalar()
        ) or 0

        contas_vencidas = (
            db.query(func.count(AccountPayable.id))
            .filter(AccountPayable.status == "atrasada")
            .scalar()
        ) or 0

        caixa_aberto = (
            db.query(func.count(CashSession.id))
            .filter(CashSession.status == "aberta")
            .scalar()
        ) or 0

        base_text = (
            f"Resumo de hoje ({today.isoformat()}): "
            f"vendas totais de R$ {total_vendido_hoje:.2f} em {num_vendas_hoje} venda(s), "
            f"lucro aproximado de R$ {total_lucro_hoje:.2f}. "
            f"{estoque_baixo} produto(s) com estoque abaixo do mínimo, "
            f"{contas_vencidas} conta(s) vencida(s) e "
            f"{'um' if caixa_aberto else 'nenhum'} caixa atualmente aberto."
        )

        if not self.ai_service.is_available():
            return base_text

        prompt = (
            "Você é um assistente de relatórios de PDV. Resuma em 2 ou 3 frases, em português, "
            "os principais pontos do dia para um gerente de loja, de forma clara e objetiva, "
            "a partir do seguinte texto:\n\n"
            f"{base_text}"
        )
        text, error = self.ai_service.generate_chat(
            [{"role": "user", "content": prompt}]
        )
        return text or base_text

    def analyze_query(
        self,
        query: str,
        conversation_history: Optional[List[Dict[str, Any]]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Analyze user question and return a JSON structure describing intent, period and data_type.
        """
        if not self.ai_service.is_available():
            return {
                "intent": "error",
                "error": "Serviço de IA não disponível. Configure em Administração > Configuração de IA.",
            }

        today_str = date.today().strftime("%d/%m/%Y")
        history_block = ""
        if conversation_history:
            recent = conversation_history[-10:]
            lines: List[str] = []
            for m in recent:
                role = (m.get("role") or "user").strip().lower()
                content = (m.get("content") or "").strip()
                if not content:
                    continue
                label = "Usuário" if role == "user" else "Assistente"
                lines.append(f"{label}: {content[:500]}{'...' if len(content) > 500 else ''}")
            if lines:
                history_block = "\n\nHistórico recente da conversa:\n" + "\n".join(lines) + "\n\n"

        prompt = f"""
Você é um assistente de relatórios de PDV (ponto de venda). O sistema possui:
- vendas (sales), itens de venda (sale_items), produtos (products),
- sessões de caixa (cash_sessions),
- contas a pagar (accounts_payable) e a receber (accounts_receivable),
- entradas de estoque (stock_entries).

Data de hoje: {today_str}.

{history_block}
Analise a pergunta abaixo e responda APENAS com um JSON válido (sem markdown) com o formato:
{{
  "intent": "consulta|resumo|esclarecer_periodo|resposta_direta",
  "data_type": "vendas|resumo_periodo|produtos_mais_vendidos|valor_estoque|entradas_estoque|sessoes_caixa|contas_pagar|contas_receber",
  "period": {{
    "start": "YYYY-MM-DD ou null",
    "end": "YYYY-MM-DD ou null",
    "type": "hoje|ultimo_mes|mes_atual|semanal|geral|proximo_mes|personalizado"
  }},
  "filters": {{}},
  "clarification_message": "texto curto ou null",
  "resposta_direta": "texto ou null"
}}

- Use intent "esclarecer_periodo" quando o usuário pedir resumo/vendas/relatório sem mencionar o período.
- Use intent "resposta_direta" apenas para perguntas simples não ligadas a dados (ex.: 'que dia é hoje?').
- Quando o usuário citar uma data específica (DD/MM/AAAA), use period.type = "personalizado" e preencha start e end em YYYY-MM-DD com essa data.

Pergunta do usuário: {query}
"""

        text, error = self.ai_service.generate_chat(
            [{"role": "user", "content": prompt}]
        )
        if error:
            return {"intent": "error", "error": error}
        if not text:
            return {"intent": "error", "error": "Resposta vazia da IA."}

        try:
            raw = text.strip()
            if raw.startswith("```"):
                raw = re.sub(r"^```(?:json)?\\s*", "", raw, flags=re.MULTILINE)
                raw = re.sub(r"```\\s*$", "", raw, flags=re.MULTILINE)
            data = json.loads(raw)
            data["period"] = self._process_period(data.get("period", {}))
            return data
        except json.JSONDecodeError as exc:
            return {"intent": "error", "error": f"Erro ao interpretar resposta da IA: {exc}"}
        except Exception as exc:  # pragma: no cover - defensive
            return {"intent": "error", "error": f"Erro ao analisar pergunta: {exc}"}

    def execute_query(self, db: Session, query_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute ORM queries based on the analysis returned by analyze_query.
        """
        data_type = query_analysis.get("data_type")
        period = query_analysis.get("period", {})
        start_date: date = period.get("start", date.today() - relativedelta(months=1))
        end_date: date = period.get("end", date.today())

        try:
            if data_type in ("vendas", "resumo_periodo"):
                return self._query_resumo_periodo(db, start_date, end_date)
            if data_type == "produtos_mais_vendidos":
                return self._query_produtos_mais_vendidos(db, start_date, end_date)
            if data_type == "valor_estoque":
                return self._query_valor_estoque(db)
            if data_type == "entradas_estoque":
                return self._query_entradas_estoque(db, start_date, end_date)
            if data_type == "sessoes_caixa":
                return self._query_sessoes_caixa(db, start_date, end_date)
            if data_type == "contas_pagar":
                return self._query_contas_pagar(db, start_date, end_date)
            if data_type == "contas_receber":
                return self._query_contas_receber(db, start_date, end_date)
            # default
            return self._query_resumo_periodo(db, start_date, end_date)
        except Exception as exc:  # pragma: no cover - defensive
            return {"type": "error", "error": str(exc)}

    def format_response(
        self, query_result: Dict[str, Any], query_analysis: Dict[str, Any], original_query: str
    ) -> str:
        """
        Use IA (when available) to turn structured data into a natural-language answer.
        """
        data_type = query_result.get("type", "")
        data = query_result.get("data", {})

        # If AI is not available, fall back to a simple deterministic text.
        if not self.ai_service.is_available():
            return json.dumps({"type": data_type, "data": data}, ensure_ascii=False)

        resumo = json.dumps({"type": data_type, "data": data}, ensure_ascii=False)
        prompt = f"""
Você é um assistente de relatórios de PDV. Explique em português, de forma clara e em até 5 frases,
os principais pontos do seguinte resultado de consulta, respondendo à pergunta do usuário.

Pergunta do usuário: {original_query}
Resultado (JSON): {resumo}
"""
        text, error = self.ai_service.generate_chat(
            [{"role": "user", "content": prompt}]
        )
        if error or not text:
            return resumo
        return text

    # ---------------------- Helpers ---------------------- #

    def _process_period(self, period_info: Dict[str, Any]) -> Dict[str, Any]:
        """Convert period info from the model into concrete start/end dates."""

        def _empty(val: Any) -> bool:
            if val is None:
                return True
            s = str(val).strip().lower()
            return s in ("", "null")

        period_type = period_info.get("type", "ultimo_mes")
        start_str = period_info.get("start")
        end_str = period_info.get("end")
        today = date.today()

        if period_type == "hoje":
            return {"start": today, "end": today, "type": "hoje"}
        if period_type == "mes_atual":
            start = today.replace(day=1)
            return {"start": start, "end": today, "type": "mes_atual"}
        if period_type == "proximo_mes":
            first_next = today.replace(day=1) + relativedelta(months=1)
            last_next = first_next.replace(day=monthrange(first_next.year, first_next.month)[1])
            return {"start": first_next, "end": last_next, "type": "proximo_mes"}
        if period_type == "semanal":
            start = today - relativedelta(days=6)
            return {"start": start, "end": today, "type": "semanal"}
        if period_type == "geral":
            return {"start": date(2000, 1, 1), "end": today, "type": "geral"}

        if not _empty(start_str):
            try:
                start_date = datetime.strptime(str(start_str).strip()[:10], "%Y-%m-%d").date()
                if not _empty(end_str):
                    end_date = datetime.strptime(str(end_str).strip()[:10], "%Y-%m-%d").date()
                else:
                    end_date = start_date
                if end_date < start_date:
                    end_date = start_date
                return {"start": start_date, "end": end_date, "type": "personalizado"}
            except ValueError:
                pass

        # default: last month
        start = (today - relativedelta(months=1)).replace(day=1)
        return {"start": start, "end": today, "type": "ultimo_mes"}

    # ---------------------- ORM queries ---------------------- #

    def _query_resumo_periodo(self, db: Session, start_date: date, end_date: date) -> Dict[str, Any]:
        vendas_query = (
            db.query(
                func.coalesce(func.sum(Sale.total_vendido), 0.0),
                func.coalesce(func.sum(Sale.total_lucro), 0.0),
                func.coalesce(func.sum(Sale.total_pecas), 0),
            )
            .filter(Sale.data_venda >= start_date)
            .filter(Sale.data_venda <= end_date)
            .filter(Sale.status != "cancelada")
        )
        row = vendas_query.one()
        total_vendido = float(row[0])
        total_lucro = float(row[1])
        total_pecas = int(row[2] or 0)
        num_vendas = (
            db.query(func.count(Sale.id))
            .filter(Sale.data_venda >= start_date)
            .filter(Sale.data_venda <= end_date)
            .filter(Sale.status != "cancelada")
            .scalar()
        ) or 0
        margem = (total_lucro / total_vendido * 100) if total_vendido > 0 else 0.0
        ticket_medio = (total_vendido / num_vendas) if num_vendas > 0 else 0.0
        return {
            "type": "resumo_periodo",
            "data": {
                "total_vendido": total_vendido,
                "total_lucro": total_lucro,
                "total_pecas": total_pecas,
                "num_vendas": num_vendas,
                "margem": margem,
                "ticket_medio": ticket_medio,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
            },
        }

    def _query_produtos_mais_vendidos(
        self, db: Session, start_date: date, end_date: date
    ) -> Dict[str, Any]:
        top_items = (
            db.query(
                Product.codigo,
                Product.nome,
                func.coalesce(func.sum(SaleItem.quantidade), 0.0).label("qtd"),
                func.coalesce(
                    func.sum(SaleItem.quantidade * SaleItem.preco_unitario), 0.0
                ).label("receita"),
                func.coalesce(func.sum(SaleItem.lucro_item), 0.0).label("lucro"),
            )
            .join(Product, Product.id == SaleItem.product_id)
            .join(Sale, Sale.id == SaleItem.sale_id)
            .filter(Sale.data_venda >= start_date)
            .filter(Sale.data_venda <= end_date)
            .filter(Sale.status != "cancelada")
            .group_by(Product.codigo, Product.nome)
            .order_by(func.sum(SaleItem.quantidade).desc())
            .limit(10)
            .all()
        )
        items = [
            {
                "codigo": cod,
                "nome": nome,
                "quantidade": float(qtd),
                "receita": float(receita),
                "lucro": float(lucro),
            }
            for cod, nome, qtd, receita, lucro in top_items
        ]
        return {
            "type": "produtos_mais_vendidos",
            "data": {
                "items": items,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
            },
        }

    def _query_valor_estoque(self, db: Session) -> Dict[str, Any]:
        produtos = db.query(Product).all()
        valor_custo = sum((p.preco_custo or 0) * (p.estoque_atual or 0) for p in produtos)
        valor_venda = sum((p.preco_venda or 0) * (p.estoque_atual or 0) for p in produtos)
        return {
            "type": "valor_estoque",
            "data": {
                "valor_estoque_custo": float(valor_custo),
                "valor_estoque_venda": float(valor_venda),
            },
        }

    def _query_entradas_estoque(
        self, db: Session, start_date: date, end_date: date
    ) -> Dict[str, Any]:
        entradas = (
            db.query(StockEntry, Product.codigo, Product.nome)
            .join(Product, Product.id == StockEntry.product_id)
            .filter(StockEntry.data_entrada >= start_date)
            .filter(StockEntry.data_entrada <= end_date)
            .order_by(StockEntry.data_entrada.desc(), StockEntry.id.desc())
            .all()
        )
        rows = [
            {
                "data_entrada": e[0].data_entrada.isoformat(),
                "codigo": e[1],
                "nome": e[2],
                "quantidade": e[0].quantity,
                "observacao": e[0].observacao or "",
            }
            for e in entradas
        ]
        return {
            "type": "entradas_estoque",
            "data": {
                "entradas": rows,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
            },
        }

    def _query_sessoes_caixa(
        self, db: Session, start_date: date, end_date: date
    ) -> Dict[str, Any]:
        sessoes = (
            db.query(CashSession)
            .filter(CashSession.data_abertura >= datetime.combine(start_date, datetime.min.time()))
            .filter(CashSession.data_abertura <= datetime.combine(end_date, datetime.max.time()))
            .order_by(CashSession.data_abertura.desc())
            .all()
        )
        rows = [
            {
                "id": s.id,
                "data_abertura": s.data_abertura.isoformat() if s.data_abertura else None,
                "data_fechamento": s.data_fechamento.isoformat() if s.data_fechamento else None,
                "valor_abertura": float(s.valor_abertura or 0),
                "valor_fechamento": float(s.valor_fechamento or 0),
                "status": s.status,
            }
            for s in sessoes
        ]
        return {
            "type": "sessoes_caixa",
            "data": {"sessoes": rows, "start_date": start_date.isoformat(), "end_date": end_date.isoformat()},
        }

    def _query_contas_pagar(
        self, db: Session, start_date: date, end_date: date
    ) -> Dict[str, Any]:
        contas = (
            db.query(AccountPayable)
            .filter(AccountPayable.data_vencimento >= start_date)
            .filter(AccountPayable.data_vencimento <= end_date)
            .order_by(AccountPayable.data_vencimento.asc())
            .all()
        )
        rows = [
            {
                "fornecedor": c.fornecedor,
                "descricao": c.descricao or "",
                "data_vencimento": c.data_vencimento.isoformat(),
                "valor": float(c.valor or 0),
                "status": c.status,
            }
            for c in contas
        ]
        return {
            "type": "contas_pagar",
            "data": {"contas": rows, "start_date": start_date.isoformat(), "end_date": end_date.isoformat()},
        }

    def _query_contas_receber(
        self, db: Session, start_date: date, end_date: date
    ) -> Dict[str, Any]:
        contas = (
            db.query(AccountReceivable)
            .filter(AccountReceivable.data_vencimento >= start_date)
            .filter(AccountReceivable.data_vencimento <= end_date)
            .order_by(AccountReceivable.data_vencimento.asc())
            .all()
        )
        rows = [
            {
                "cliente": c.cliente,
                "descricao": c.descricao or "",
                "data_vencimento": c.data_vencimento.isoformat(),
                "valor": float(c.valor or 0),
                "status": c.status,
            }
            for c in contas
        ]
        return {
            "type": "contas_receber",
            "data": {"contas": rows, "start_date": start_date.isoformat(), "end_date": end_date.isoformat()},
        }

