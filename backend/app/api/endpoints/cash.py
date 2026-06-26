from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.user import User
from app.models.cash_session import CashSession
from app.schemas.cash import CashSessionClose, CashSessionOpen, CashSessionResponse, CashSessionUpdate

router = APIRouter()


def _get_open_session(db: Session) -> CashSession | None:
    return db.query(CashSession).filter(CashSession.status == "aberta").first()


@router.get("/current", response_model=CashSessionResponse | None)
def get_current_session(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _get_open_session(db)


@router.get("/sessions", response_model=list[CashSessionResponse])
def list_sessions(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    limit: int = 50,
):
    return db.query(CashSession).order_by(CashSession.id.desc()).limit(limit).all()


@router.post("/open", response_model=CashSessionResponse, status_code=status.HTTP_201_CREATED)
def open_session(
    body: CashSessionOpen,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente", "vendedor"])),
):
    if _get_open_session(db):
        raise HTTPException(status_code=400, detail="A cash session is already open")
    session = CashSession(
        valor_abertura=body.valor_abertura,
        observacao=body.observacao,
        status="aberta",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.post("/close", response_model=CashSessionResponse)
def close_session(
    body: CashSessionClose,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente", "vendedor"])),
):
    session = _get_open_session(db)
    if not session:
        raise HTTPException(status_code=400, detail="No open cash session")
    session.data_fechamento = datetime.utcnow()
    session.valor_fechamento = body.valor_fechamento
    session.observacao = body.observacao or session.observacao
    session.status = "fechada"
    db.commit()
    db.refresh(session)
    return session


@router.patch("/sessions/{session_id}", response_model=CashSessionResponse)
def update_cash_session(
    session_id: int,
    body: CashSessionUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin"])),
):
    session = db.query(CashSession).filter(CashSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Cash session not found")

    if body.data_abertura is not None:
        session.data_abertura = body.data_abertura
    if body.data_fechamento is not None:
        session.data_fechamento = body.data_fechamento
    if body.valor_abertura is not None:
        session.valor_abertura = body.valor_abertura
    if body.valor_fechamento is not None:
        session.valor_fechamento = body.valor_fechamento
    if body.status is not None:
        if body.status not in ["aberta", "fechada"]:
            raise HTTPException(status_code=400, detail="Invalid status. Must be 'aberta' or 'fechada'")
        session.status = body.status
    if body.observacao is not None:
        session.observacao = body.observacao

    db.commit()
    db.refresh(session)
    return session
