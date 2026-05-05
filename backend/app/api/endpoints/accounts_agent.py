from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.user import User
from app.services.accounts_agent_service import AccountsAgentService


router = APIRouter()


class ChatMessage(BaseModel):
  role: str
  content: str


class AccountsAgentParseIn(BaseModel):
  query: str
  history: list[ChatMessage] = []


class AccountsAgentParseOut(BaseModel):
  status: str
  message: str
  questions: list[str]
  records: list[dict]


class AccountsAgentConfirmIn(BaseModel):
  records: list[dict]


class AccountsAgentConfirmOut(BaseModel):
  success: bool
  count: int
  message: str


@router.post("/parse", response_model=AccountsAgentParseOut)
def parse_accounts_request(
  body: AccountsAgentParseIn,
  db: Session = Depends(get_db),
  user: User = Depends(require_roles(["admin", "gerente"])),
):
  service = AccountsAgentService(db)
  history_payload = [m.model_dump() for m in body.history]
  out = service.parse_request(body.query, conversation_history=history_payload)
  status_val = out.get("status") or "error"
  message = out.get("message") or ""
  questions = list(out.get("questions") or [])
  records = list(out.get("records") or [])
  return AccountsAgentParseOut(
    status=status_val,
    message=message,
    questions=questions,
    records=records,
  )


@router.post("/confirm", response_model=AccountsAgentConfirmOut)
def confirm_accounts_insert(
  body: AccountsAgentConfirmIn,
  db: Session = Depends(get_db),
  user: User = Depends(require_roles(["admin", "gerente"])),
):
  service = AccountsAgentService(db)
  result = service.execute_insert(db, body.records)
  if not result.get("success"):
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail=result.get("message", "Erro ao cadastrar contas."),
    )
  return AccountsAgentConfirmOut(
    success=True,
    count=int(result.get("count") or 0),
    message=result.get("message", ""),
  )

