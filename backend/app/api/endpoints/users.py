from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.core.security import get_password_hash
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserResponse

router = APIRouter()


@router.get("/", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin"])),
):
    return db.query(User).order_by(User.id).all()


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin"])),
):
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    u = User(
        username=body.username,
        name=body.name,
        password_hash=get_password_hash(body.password),
        role=body.role,
        active=True,
        signo=body.signo,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin"])),
):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return u


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    body: UserUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin"])),
):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    if body.name is not None:
        u.name = body.name
    if body.role is not None:
        u.role = body.role
    if body.active is not None:
        u.active = body.active
    if body.signo is not None:
        u.signo = body.signo
    if body.password is not None and body.password.strip():
        u.password_hash = get_password_hash(body.password)
    db.commit()
    db.refresh(u)
    return u


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin"])),
):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    if u.id == user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    u.active = False
    db.commit()
