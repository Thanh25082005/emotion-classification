from fastapi import APIRouter
from ...schemas.model_schema import HealthResponse
from ...core.config import settings

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="ai-service",
        version=settings.app_version,
    )
