"""
Database engine and session.
"""
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

# SQLite needs check_same_thread=False
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False
    # Ensure directory exists for sqlite path like sqlite:///./data/pdv.db
    if "/" in settings.DATABASE_URL.rstrip("/").split("///")[-1]:
        path = settings.DATABASE_URL.split("///")[-1]
        Path(path).parent.mkdir(parents=True, exist_ok=True)

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args if connect_args else {},
    echo=False,
    pool_pre_ping=not settings.DATABASE_URL.startswith("sqlite"),
    pool_size=10 if not settings.DATABASE_URL.startswith("sqlite") else 5,
    max_overflow=20 if not settings.DATABASE_URL.startswith("sqlite") else 0,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
