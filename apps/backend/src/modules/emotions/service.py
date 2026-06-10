import uuid
import base64
from fastapi import UploadFile
from ...db.models.user import User
from ...core.exceptions import NotFoundException
from ...clients.ai_service_client import AIServiceClient
from ...api.v1.schemas.emotion_schema import EmotionHistoryResponse, EmotionStatisticsResponse
from .repository import EmotionRepository
from ...core.logger import get_logger

logger = get_logger(__name__)


class EmotionService:
    def __init__(self, db):
        self.repo = EmotionRepository(db)
        self.ai_client = AIServiceClient()

    async def predict(self, user: User, file: UploadFile, source_type: str):
        content = await file.read()
        ai_response = await self.ai_client.classify_image(content, str(user.id))

        faces = [face.model_dump() for face in ai_response.faces]
        dominant_emotion = None
        confidence = None
        if faces:
            dominant_face = max(faces, key=lambda f: f["confidence"])
            dominant_emotion = dominant_face["emotion"]
            confidence = dominant_face["confidence"]

        result = await self.repo.create(
            user_id=user.id,
            source_type=source_type,
            faces=faces,
            dominant_emotion=dominant_emotion,
            confidence=confidence,
            ai_service_version=ai_response.ai_service_version,
            processing_time_ms=ai_response.processing_time_ms,
        )
        result.faces = faces
        return result

    async def predict_from_base64(self, user: User, frame_base64: str, source_type: str):
        image_bytes = base64.b64decode(frame_base64)
        ai_response = await self.ai_client.classify_image(image_bytes, str(user.id))

        faces = [face.model_dump() for face in ai_response.faces]
        dominant_emotion = None
        confidence = None
        if faces:
            dominant_face = max(faces, key=lambda f: f["confidence"])
            dominant_emotion = dominant_face["emotion"]
            confidence = dominant_face["confidence"]

        result = await self.repo.create(
            user_id=user.id,
            source_type=source_type,
            faces=faces,
            dominant_emotion=dominant_emotion,
            confidence=confidence,
            ai_service_version=ai_response.ai_service_version,
            processing_time_ms=ai_response.processing_time_ms,
        )
        result.faces = faces
        return result

    async def get_history(self, user: User, page: int, page_size: int) -> EmotionHistoryResponse:
        items, total = await self.repo.get_history(user.id, page, page_size)
        for item in items:
            if not isinstance(item.faces, list):
                item.faces = []
        return EmotionHistoryResponse(items=items, total=total, page=page, page_size=page_size)

    async def get_by_id(self, user: User, result_id: uuid.UUID):
        result = await self.repo.get_by_id(result_id, user.id)
        if not result:
            raise NotFoundException("Emotion result")
        if not isinstance(result.faces, list):
            result.faces = []
        return result

    async def get_statistics(self, user: User) -> EmotionStatisticsResponse:
        stats = await self.repo.get_statistics(user.id)
        return EmotionStatisticsResponse(**stats)

    async def delete(self, user: User, result_id: uuid.UUID) -> None:
        deleted = await self.repo.delete(result_id, user.id)
        if not deleted:
            raise NotFoundException("Emotion result")
