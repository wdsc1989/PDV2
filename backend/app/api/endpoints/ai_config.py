from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.core.ai_config import AIConfigManager
from app.services.ai_service import AIService
from app.models.user import User


router = APIRouter()


class AIConfigIn(BaseModel):
  provider: str
  api_key: str | None = None
  model: str | None = None
  base_url: str | None = None
  enabled: bool = True


class AIConfigOut(BaseModel):
  provider: str
  api_key: str | None = None
  model: str | None = None
  base_url: str | None = None
  enabled: bool

  class Config:
    from_attributes = True


@router.get("/config", response_model=list[AIConfigOut])
def list_ai_configs(
  db: Session = Depends(get_db),
  user: User = Depends(require_roles(["admin"])),
):
  return AIConfigManager.get_all_configs(db)


@router.get("/config/active")
def get_active_ai_config(
  db: Session = Depends(get_db),
  user: User = Depends(require_roles(["admin"])),
):
  cfg = AIConfigManager.get_config_dict(db)
  if not cfg:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI configuration not found")
  return cfg


@router.post("/config", response_model=AIConfigOut, status_code=status.HTTP_201_CREATED)
def save_ai_config(
  body: AIConfigIn,
  db: Session = Depends(get_db),
  user: User = Depends(require_roles(["admin"])),
):
  cfg = AIConfigManager.save_config(
    db=db,
    provider=body.provider,
    api_key=body.api_key,
    model=body.model,
    base_url=body.base_url,
    enabled=body.enabled,
  )
  return cfg


@router.delete("/config/{provider}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ai_config(
  provider: str,
  db: Session = Depends(get_db),
  user: User = Depends(require_roles(["admin"])),
):
  deleted = AIConfigManager.delete_config(db, provider)
  if not deleted:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI configuration not found")


@router.get("/test")
def test_ai_connection(
  db: Session = Depends(get_db),
  user: User = Depends(require_roles(["admin"])),
):
  service = AIService(db)
  success, message = service.test_connection()
  return {"success": success, "message": message}

