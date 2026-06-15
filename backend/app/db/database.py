"""
Engine + session SQLAlchemy (SQLite, mot file -- khong can server).
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

# check_same_thread=False: cho phep dung SQLite tu nhieu thread (FastAPI threadpool)
engine = create_engine(
    settings.DB_URL,
    connect_args={"check_same_thread": False} if settings.DB_URL.startswith("sqlite") else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """Dependency FastAPI: mo session cho moi request, dong sau khi xong."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Tao bang luc khoi dong (import model truoc de chung dang ky vao Base.metadata)."""
    from app.models import log, user  # noqa: F401

    Base.metadata.create_all(bind=engine)
