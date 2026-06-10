import uuid
import httpx
from pydantic import BaseModel
from typing import Optional
from ..core.config import settings
from ..core.exceptions import (
    AIServiceUnavailableException,
    AIServiceTimeoutException,
    NoFaceDetectedException,
)
from ..core.logger import get_logger

logger = get_logger(__name__)


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


class AIFaceResult(BaseModel):
    face_id: str
    box: Optional[BoundingBox] = None
    emotion: str
    confidence: float
    scores: EmotionScores


class AIInferenceResponse(BaseModel):
    request_id: str
    faces: list[AIFaceResult]
    processing_time_ms: Optional[int] = None
    ai_service_version: Optional[str] = None


class AIServiceClient:
    def __init__(self):
        self.base_url = settings.AI_SERVICE_BASE_URL.rstrip("/")
        self.timeout = settings.AI_SERVICE_TIMEOUT_SECONDS

    async def health_check(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(f"{self.base_url}/internal/v1/health")
                return response.status_code == 200
        except Exception:
            return False

    async def classify_image(self, image_bytes: bytes, user_id: str) -> AIInferenceResponse:
        request_id = str(uuid.uuid4())
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/internal/v1/inference/image",
                    files={"file": ("image.jpg", image_bytes, "image/jpeg")},
                    data={"request_id": request_id, "user_id": user_id},
                )

                if response.status_code == 200:
                    data = response.json()
                    if data.get("status") == "error":
                        error_code = data.get("error", {}).get("code", "UNKNOWN")
                        if error_code == "NO_FACE_DETECTED":
                            raise NoFaceDetectedException()
                        raise AIServiceUnavailableException(
                            data.get("error", {}).get("message", "Unknown AI error")
                        )
                    return self._parse_response(data)

                if response.status_code in (502, 503, 504):
                    raise AIServiceUnavailableException(
                        f"AI Service returned {response.status_code}"
                    )
                raise AIServiceUnavailableException(
                    f"Unexpected status from AI Service: {response.status_code}"
                )

        except (httpx.ConnectError, httpx.ConnectTimeout):
            logger.warning(f"AI Service not reachable at {self.base_url}")
            raise AIServiceUnavailableException(
                f"Cannot connect to AI Service at {self.base_url}"
            )
        except httpx.ReadTimeout:
            raise AIServiceTimeoutException()
        except (NoFaceDetectedException, AIServiceUnavailableException, AIServiceTimeoutException):
            raise
        except Exception as e:
            logger.error(f"Unexpected error calling AI Service: {e}", exc_info=True)
            raise AIServiceUnavailableException(str(e))

    def _parse_response(self, data: dict) -> AIInferenceResponse:
        faces = []
        for face_data in data.get("faces", []):
            scores_data = face_data.get("scores", {})
            box_data = face_data.get("box")
            face = AIFaceResult(
                face_id=face_data.get("face_id", "face-0"),
                box=BoundingBox(**box_data) if box_data else None,
                emotion=face_data.get("emotion", "neutral"),
                confidence=face_data.get("confidence", 0.0),
                scores=EmotionScores(**scores_data),
            )
            faces.append(face)

        return AIInferenceResponse(
            request_id=data.get("request_id", ""),
            faces=faces,
            processing_time_ms=data.get("processing_time_ms"),
            ai_service_version=data.get("model_version"),
        )
