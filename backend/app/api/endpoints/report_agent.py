from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.user import User
from app.services.report_agent_service import ReportAgentService


router = APIRouter()


class ChatMessage(BaseModel):
  role: str
  content: str


class ReportAgentContext(BaseModel):
  module: str | None = None
  filters: dict | None = None


class ReportAgentQueryIn(BaseModel):
  query: str
  history: list[ChatMessage] = []
  context: ReportAgentContext | None = None


class ReportAgentQueryOut(BaseModel):
  messages: list[ChatMessage]
  table_data: dict | None = None
  raw_result: dict | None = None


@router.get("/initial", response_model=str)
def get_initial(
  db: Session = Depends(get_db),
  user: User = Depends(require_roles(["admin"])),
):
  service = ReportAgentService(db)
  return service.get_initial_analysis(db)


@router.post("/query", response_model=ReportAgentQueryOut)
def run_query(
  body: ReportAgentQueryIn,
  db: Session = Depends(get_db),
  user: User = Depends(require_roles(["admin"])),
):
  service = ReportAgentService(db)
  history_payload = [m.model_dump() for m in body.history]
  context_payload = body.context.model_dump() if body.context is not None else None
  analysis = service.analyze_query(body.query, conversation_history=history_payload, context=context_payload)
  if analysis.get("intent") == "error":
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=analysis.get("error", "Erro na análise da pergunta."))
  if analysis.get("intent") == "esclarecer_periodo":
    msg = analysis.get("clarification_message") or "De qual período deseja o relatório? (ex.: hoje, esta semana, este mês)"
    return ReportAgentQueryOut(
      messages=[
        ChatMessage(role="user", content=body.query),
        ChatMessage(role="assistant", content=str(msg)),
      ],
      table_data=None,
      raw_result=analysis,
    )
  if analysis.get("intent") == "resposta_direta":
    msg = analysis.get("resposta_direta") or "Não entendi. Você pode perguntar sobre faturamento, vendas, estoque, contas a pagar, etc."
    return ReportAgentQueryOut(
      messages=[
        ChatMessage(role="user", content=body.query),
        ChatMessage(role="assistant", content=str(msg)),
      ],
      table_data=None,
      raw_result=analysis,
    )

  query_result = service.execute_query(db, analysis)
  if query_result.get("type") == "error":
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=query_result.get("error", "Erro ao executar consulta."))

  response_text = service.format_response(query_result, analysis, body.query)

  table_data = None
  qt = query_result.get("type")
  data = query_result.get("data", {})
  # A small, generic schema for tabular results; frontend may choose to ignore or adapt.
  if qt in {"produtos_mais_vendidos", "entradas_estoque", "sessoes_caixa", "contas_pagar", "contas_receber"}:
    if "items" in data:
      rows = data["items"]
    elif "entradas" in data:
      rows = data["entradas"]
    elif "sessoes" in data:
      rows = data["sessoes"]
    elif "contas" in data:
      rows = data["contas"]
    else:
      rows = None
    if rows:
      if isinstance(rows, list) and rows and isinstance(rows[0], dict):
        columns = list(rows[0].keys())
        table_data = {"columns": columns, "rows": [[r.get(c) for c in columns] for r in rows]}

  return ReportAgentQueryOut(
    messages=[
      ChatMessage(role="user", content=body.query),
      ChatMessage(role="assistant", content=response_text),
    ],
    table_data=table_data,
    raw_result=query_result,
  )

