from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime


class BoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int


class EmotionScores(BaseModel):
    angry: float = 0.0
    disgust: float = 0.0
    fear: float = 0.0
    happy: float = 0.0
    neutral: float = 0.0
    sad: float = 0.0
    surprise: float = 0.0


class FaceResultSchema(BaseModel):
    face_id: str
    box: Optional[BoundingBox] = None
    emotion: str
    confidence: float
    scores: EmotionScores


class EmotionResultResponse(BaseModel):
    id: str
    user_id: str
    source_type: str
    faces: List[FaceResultSchema]
    dominant_emotion: str
    confidence: float
    processing_time_ms: Optional[float] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class EmotionResultListResponse(BaseModel):
    success: bool
    data: List[EmotionResultResponse]
    total: int


class EmotionStatisticsResponse(BaseModel):
    success: bool
    data: dict


class PredictResponse(BaseModel):
    success: bool
    data: EmotionResultResponse
