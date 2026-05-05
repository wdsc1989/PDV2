from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password
from app.models.user import User


def authenticate(db: Session, username: str, password: str) -> User | None:
    user = db.query(User).filter(User.username == username, User.active.is_(True)).first()
    if user and verify_password(password, user.password_hash):
        return user
    return None


def ensure_default_admin(db: Session) -> None:
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        user = User(
            username="admin",
            name="Administrador",
            password_hash=get_password_hash("admin123"),
            role="admin",
            active=True,
        )
        db.add(user)
        db.commit()
