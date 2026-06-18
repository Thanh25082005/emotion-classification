"""
REST export (vong mo rong):
  GET /api/logs/export.csv (can token)
    -> 200, Content-Type text/csv, attachment filename="emotions.csv"
       cot: ts,emotion,confidence ; CHI log cua user hien tai.
"""
import csv
import io

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.database import get_db
from app.models.log import EmotionLog
from app.models.user import User

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("/export.csv")
def export_csv(current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.execute(
        select(EmotionLog.ts, EmotionLog.emotion, EmotionLog.confidence)
        .where(EmotionLog.user_id == current.id)
        .order_by(EmotionLog.ts)
    ).all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["ts", "emotion", "confidence"])
    for ts, emotion, confidence in rows:
        writer.writerow([ts, emotion, confidence])

    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="emotions.csv"'},
    )
