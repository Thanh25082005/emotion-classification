import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from ...db.models.emotion_result import EmotionResult


class EmotionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        user_id: uuid.UUID,
        source_type: str,
        faces: list,
        dominant_emotion: Optional[str],
        confidence: Optional[float],
        ai_service_version: Optional[str],
        processing_time_ms: Optional[int],
    ) -> EmotionResult:
        result = EmotionResult(
            user_id=user_id,
            source_type=source_type,
            faces=faces,
            dominant_emotion=dominant_emotion,
            confidence=confidence,
            ai_service_version=ai_service_version,
            processing_time_ms=processing_time_ms,
        )
        self.db.add(result)
        await self.db.flush()
        await self.db.refresh(result)
        return result

    async def get_by_id(self, result_id: uuid.UUID, user_id: uuid.UUID) -> Optional[EmotionResult]:
        q = await self.db.execute(
            select(EmotionResult).where(
                EmotionResult.id == result_id,
                EmotionResult.user_id == user_id,
            )
        )
        return q.scalar_one_or_none()

    async def get_history(
        self, user_id: uuid.UUID, page: int, page_size: int
    ) -> tuple[list[EmotionResult], int]:
        offset = (page - 1) * page_size
        count_q = await self.db.execute(
            select(func.count()).select_from(EmotionResult).where(EmotionResult.user_id == user_id)
        )
        total = count_q.scalar_one()
        results_q = await self.db.execute(
            select(EmotionResult)
            .where(EmotionResult.user_id == user_id)
            .order_by(EmotionResult.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        return list(results_q.scalars().all()), total

    async def delete(self, result_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        result = await self.get_by_id(result_id, user_id)
        if not result:
            return False
        await self.db.delete(result)
        return True

    async def get_statistics(self, user_id: uuid.UUID) -> dict:
        total_q = await self.db.execute(
            select(func.count()).select_from(EmotionResult).where(EmotionResult.user_id == user_id)
        )
        total = total_q.scalar_one()

        avg_q = await self.db.execute(
            select(func.avg(EmotionResult.confidence)).where(EmotionResult.user_id == user_id)
        )
        avg_confidence = avg_q.scalar_one() or 0.0

        dist_q = await self.db.execute(
            select(EmotionResult.dominant_emotion, func.count())
            .where(
                EmotionResult.user_id == user_id,
                EmotionResult.dominant_emotion.is_not(None),
            )
            .group_by(EmotionResult.dominant_emotion)
        )
        distribution = {row[0]: row[1] for row in dist_q.all()}
        most_common = max(distribution, key=lambda k: distribution[k]) if distribution else None

        return {
            "total_predictions": total,
            "emotion_distribution": distribution,
            "average_confidence": round(float(avg_confidence), 4),
            "most_common_emotion": most_common,
        }
