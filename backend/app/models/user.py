from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="vendedor")
    active = Column(Boolean, nullable=False, default=True)
    signo = Column(String(20), nullable=True)
    # % de comissão padrão sobre o total vendido (todos os perfis; típico p/ vendedor).
    comissao_percentual = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
