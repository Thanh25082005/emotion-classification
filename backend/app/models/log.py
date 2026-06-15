"""SQLAlchemy model: emotion_logs (muc 6.3)."""
from sqlalchemy import Float, ForeignKey, Integer, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class EmotionLog(Base):
    __tablename__ = "emotion_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False, index=True
    )
    ts: Mapped[str] = mapped_column(String, server_default=text("(datetime('now'))"))
    emotion: Mapped[str] = mapped_column(String, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
