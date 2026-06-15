"""
REST logs (muc 6.1):
  GET /api/logs/stats (can token) -> 200 {"counts": {...}, "total": N}
Tong hop so lan moi cam xuc cua user hien tai.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.database import get_db
from app.models.log import EmotionLog
from app.models.user import User
from app.schemas.logs import StatsResponse

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("/stats", response_model=StatsResponse)
def stats(current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.execute(
        select(EmotionLog.emotion, func.count())
        .where(EmotionLog.user_id == current.id)
        .group_by(EmotionLog.emotion)
    ).all()
    counts = {emotion: count for emotion, count in rows}
    return StatsResponse(counts=counts, total=sum(counts.values()))
