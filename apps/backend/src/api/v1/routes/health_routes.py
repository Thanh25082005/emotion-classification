from fastapi import APIRouter
from ....core.config import settings

router = APIRouter()


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "emotion-classification-backend",
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
        "ai_service_url": settings.AI_SERVICE_BASE_URL,
    }
