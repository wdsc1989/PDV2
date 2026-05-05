from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.core.deps import get_current_user
from app.schemas.auth import LoginRequest, RefreshRequest, Token, UserResponse
from app.services.auth_service import authenticate

router = APIRouter()


@router.post("/login", response_model=Token)
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = authenticate(db, form.username, form.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    extra = {"role": user.role}
    access_token = create_access_token(subject=user.id, extra=extra)
    refresh_token = create_refresh_token(subject=user.id)
    return Token(access_token=access_token, refresh_token=refresh_token)


@router.post("/login/json", response_model=Token)
def login_json(
    body: LoginRequest,
    db: Session = Depends(get_db),
):
    user = authenticate(db, body.username, body.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    extra = {"role": user.role}
    access_token = create_access_token(subject=user.id, extra=extra)
    refresh_token = create_refresh_token(subject=user.id)
    return Token(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=Token)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    payload = decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    from app.models.user import User

    user = db.query(User).filter(User.id == int(user_id), User.active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    extra = {"role": user.role}
    new_access = create_access_token(subject=user.id, extra=extra)
    new_refresh = create_refresh_token(subject=user.id)
    return Token(access_token=new_access, refresh_token=new_refresh)


@router.get("/me", response_model=UserResponse)
def me(user=Depends(get_current_user)):
    return user
