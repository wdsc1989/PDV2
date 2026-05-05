from __future__ import annotations

"""
Agent for creating accounts payable/receivable from natural language.
"""

import json
import re
from calendar import monthrange
from datetime import date
from typing import Any, Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.account_payable import AccountPayable
from app.models.account_receivable import AccountReceivable
from app.services.ai_service import AIService


def _today_str() -> str:
  return date.today().strftime("%d/%m/%Y")


def _parse_ai_response(text: str) -> Dict[str, Any]:
  text = (text or "").strip()
  if text.startswith("```"):
    text = re.sub(r"^```(?:json)?\\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"```\\s*$", "", text, flags=re.MULTILINE)
  return json.loads(text)


def _expand_bulk_dates(bulk: Dict[str, Any]) -> List[date]:
  day = int(bulk.get("dia", 1))
  month_start = int(bulk.get("mes_inicio", 1))
  month_end = int(bulk.get("mes_fim", 12))
  year = int(bulk.get("ano", date.today().year))
  month_start = max(1, month_start)
  month_end = min(12, month_end)
  if month_start > month_end:
    month_start, month_end = month_end, month_start
  dates: List[date] = []
  for m in range(month_start, month_end + 1):
    last = monthrange(year, m)[1]
    d = min(day, last)
    dates.append(date(year, m, d))
  return dates


class AccountsAgentService:
  """
  Interpret natural language for creating and settling accounts payable/receivable.
  """

  def __init__(self, db: Session):
    self.db = db
    self.ai_service = AIService(db)

  def is_available(self) -> bool:
    return self.ai_service.is_available()

  def parse_request(
    self,
    message: str,
    conversation_history: Optional[List[Dict[str, Any]]] = None,
  ) -> Dict[str, Any]:
    """
    Interpret the request and return:
    - status: "need_info" | "confirm" | "error"
    - questions: list of clarification questions
    - records: list of normalized records for confirmation
    - message: text to show to the user
    """
    if not self.ai_service.is_available():
      return {
        "status": "error",
        "message": "Configure a IA em Administração > Configuração de IA para usar o agente de contas.",
        "questions": [],
        "records": [],
      }

    today = _today_str()
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
        history_block = (
          "\n\nHistórico recente da conversa (para manter o contexto até finalizar o cadastro/baixa):\n"
          + "\n".join(lines)
          + "\n\n"
        )

    prompt = f"""Você é um assistente que interpreta pedidos de cadastro de **contas a pagar** (fornecedores) e **contas a receber** (clientes / vendas fiado).

Data de HOJE: {today}. Datas no Brasil são DD/MM/AAAA.
{history_block}
Estrutura dos dados:
- Conta a pagar: fornecedor (obrigatório), descricao (opcional), valor (obrigatório), data_vencimento (obrigatório), observacao (opcional).
- Conta a receber: cliente (obrigatório), descricao (opcional), valor (obrigatório), data_vencimento (obrigatório), observacao (opcional).

O usuário pode pedir cadastro em massa, por exemplo:
- \"todo dia 8 dos meses do ano de 2026\" → bulk: dia 8, meses 1 a 12, ano 2026.

Analise a mensagem do usuário e retorne APENAS um JSON válido (sem markdown) no formato:
{{
  "tipo": "pagar|receber",
  "fornecedor": "nome do fornecedor ou null",
  "cliente": "nome do cliente ou null",
  "descricao": "descricao ou null",
  "valor": número ou null,
  "data_vencimento": "YYYY-MM-DD ou null",
  "observacao": "texto ou null",
  "bulk": null ou {{ "dia": 8, "mes_inicio": 1, "mes_fim": 12, "ano": 2026 }},
  "missing": [],
  "clarification_questions": []
}}

Mensagem atual do usuário: {message}
"""

    text, error = self.ai_service.generate_chat(
      [{"role": "user", "content": prompt}]
    )
    if error:
      return {"status": "error", "message": error, "questions": [], "records": []}
    if not text:
      return {"status": "error", "message": "Resposta vazia da IA.", "questions": [], "records": []}

    try:
      parsed = _parse_ai_response(text)
    except json.JSONDecodeError as exc:
      return {"status": "error", "message": f"Erro ao interpretar resposta: {exc}", "questions": [], "records": []}
    except Exception as exc:  # pragma: no cover - defensive
      return {"status": "error", "message": str(exc), "questions": [], "records": []}

    tipo = (parsed.get("tipo") or "").strip().lower()
    if tipo not in ("pagar", "receber"):
      return {
        "status": "need_info",
        "message": "Não ficou claro se é uma conta **a pagar** (fornecedor) ou **a receber** (cliente/fiado).",
        "questions": ["É conta a pagar ou a receber?"],
        "records": [],
      }

    fornecedor = (parsed.get("fornecedor") or "").strip() or None
    cliente = (parsed.get("cliente") or "").strip() or None
    descricao = (parsed.get("descricao") or "").strip() or None
    try:
      valor = float(parsed.get("valor")) if parsed.get("valor") is not None else None
    except (TypeError, ValueError):
      valor = None
    data_venc_str = parsed.get("data_vencimento")
    observacao = (parsed.get("observacao") or "").strip() or None
    bulk = parsed.get("bulk")

    missing = list(parsed.get("missing") or [])
    questions = list(parsed.get("clarification_questions") or [])

    if tipo == "pagar" and not fornecedor:
      if "fornecedor" not in missing:
        missing.append("fornecedor")
      questions.append("Qual o nome do fornecedor ou descrição da conta a pagar?")
    if tipo == "receber" and not cliente:
      if "cliente" not in missing:
        missing.append("cliente")
      questions.append("Qual o nome do cliente (conta a receber)?")
    if valor is None or valor <= 0:
      if "valor" not in missing:
        missing.append("valor")
      questions.append("Qual o valor?")
    if not bulk and not data_venc_str:
      if "data_vencimento" not in missing:
        missing.append("data_vencimento")
      questions.append("Qual a data de vencimento?")

    if missing and questions:
      # Ask for more info
      return {
        "status": "need_info",
        "message": "Preciso de mais algumas informações:\n\n" + "\n".join(f"- {q}" for q in questions),
        "questions": questions,
        "records": [],
      }

    records: List[Dict[str, Any]] = []
    if bulk and isinstance(bulk, dict):
      for d in _expand_bulk_dates(bulk):
        records.append(
          {
            "tipo": tipo,
            "fornecedor": fornecedor,
            "cliente": cliente,
            "descricao": descricao,
            "valor": valor or 0,
            "data_vencimento": d.isoformat(),
            "observacao": observacao,
          }
        )
    else:
      try:
        if data_venc_str:
          dt = date.fromisoformat(data_venc_str)
        else:
          dt = date.today()
      except (ValueError, TypeError):
        dt = date.today()
      records.append(
        {
          "tipo": tipo,
          "fornecedor": fornecedor,
          "cliente": cliente,
          "descricao": descricao,
          "valor": valor or 0,
          "data_vencimento": dt.isoformat(),
          "observacao": observacao,
        }
      )

    # Short summary for confirmation
    n = len(records)
    if n == 1:
      r = records[0]
      if tipo == "pagar":
        msg = f"Conta a pagar: {r.get('fornecedor') or 'Fornecedor'} — R$ {float(r['valor']):.2f} — venc. {r['data_vencimento']}"
      else:
        msg = f"Conta a receber: {r.get('cliente') or 'Cliente'} — R$ {float(r['valor']):.2f} — venc. {r['data_vencimento']}"
    else:
      r0 = records[0]
      if tipo == "pagar":
        msg = f"{n} contas a pagar: {r0.get('fornecedor') or 'Fornecedor'} — R$ {float(r0['valor']):.2f}"
      else:
        msg = f"{n} contas a receber: {r0.get('cliente') or 'Cliente'} — R$ {float(r0['valor']):.2f}"
    msg += "\n\nConfirma o cadastro?"

    return {
      "status": "confirm",
      "message": msg,
      "questions": [],
      "records": records,
    }

  def execute_insert(self, db: Session, records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Insert normalized records into the database.
    """
    if not records:
      return {"success": False, "count": 0, "message": "Nenhum registro para inserir."}
    try:
      count = 0
      for r in records:
        tipo = (r.get("tipo") or "pagar").strip().lower()
        valor = float(r.get("valor", 0))
        data_venc = r.get("data_vencimento")
        if isinstance(data_venc, str):
          data_venc = date.fromisoformat(data_venc)
        if tipo == "pagar":
          fornecedor = (r.get("fornecedor") or "").strip() or "Fornecedor"
          obj = AccountPayable(
            fornecedor=fornecedor,
            descricao=(r.get("descricao") or "").strip() or None,
            data_vencimento=data_venc,
            valor=valor,
            observacao=(r.get("observacao") or "").strip() or None,
          )
          obj.update_status()
          db.add(obj)
        else:
          cliente = (r.get("cliente") or "").strip() or "Cliente"
          obj = AccountReceivable(
            cliente=cliente,
            descricao=(r.get("descricao") or "").strip() or None,
            data_vencimento=data_venc,
            valor=valor,
            observacao=(r.get("observacao") or "").strip() or None,
          )
          obj.update_status()
          db.add(obj)
        count += 1
      db.commit()
      return {"success": True, "count": count, "message": f"Cadastro realizado: {count} conta(s) criada(s)."}
    except Exception as exc:  # pragma: no cover - defensive
      db.rollback()
      return {"success": False, "count": 0, "message": f"Erro ao cadastrar: {exc}"}

