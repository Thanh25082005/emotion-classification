import uuid
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, List


class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float


class EmotionScores(BaseModel):
    angry: float = 0.0
    disgust: float = 0.0
    fear: float = 0.0
    happy: float = 0.0
    sad: float = 0.0
    surprise: float = 0.0
    neutral: float = 0.0


class FaceResult(BaseModel):
    face_id: str
    box: Optional[BoundingBox] = None
    emotion: str
    confidence: float
    scores: EmotionScores


class EmotionResultResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    source_type: str
    faces: List[FaceResult]
    dominant_emotion: Optional[str] = None
    confidence: Optional[float] = None
    processing_time_ms: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class EmotionHistoryResponse(BaseModel):
    items: List[EmotionResultResponse]
    total: int
    page: int
    page_size: int


class EmotionStatisticsResponse(BaseModel):
    total_predictions: int
    emotion_distribution: dict
    average_confidence: float
    most_common_emotion: Optional[str] = None
