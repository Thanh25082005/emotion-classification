from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from .common_schema import ErrorDetail, BaseResponse


class BoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int


class EmotionScores(BaseModel):
    angry: float
    disgust: float
    fear: float
    happy: float
    neutral: float
    sad: float
    surprise: float


class FaceResult(BaseModel):
    face_id: str
    box: BoundingBox
    emotion: str
    confidence: float
    scores: EmotionScores


class InferenceSuccessResponse(BaseResponse):
    status: str = "success"
    faces: List[FaceResult] = []


class InferenceErrorResponse(BaseResponse):
    status: str = "error"
    error: ErrorDetail


class FrameRequest(BaseModel):
    request_id: Optional[str] = None
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    frame_base64: str
    timestamp: Optional[str] = None


class ImageBase64Request(BaseModel):
    request_id: Optional[str] = None
    user_id: Optional[str] = None
    image_base64: str
