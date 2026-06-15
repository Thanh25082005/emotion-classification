"""Pydantic schema cho thong ke log (muc 6.1)."""
from pydantic import BaseModel


class StatsResponse(BaseModel):
    counts: dict[str, int]  # {"happy": 12, "sad": 3, ...}
    total: int
