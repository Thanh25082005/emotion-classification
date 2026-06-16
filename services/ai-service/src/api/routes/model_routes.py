from fastapi import APIRouter
from ...schemas.model_schema import ModelInfoResponse, ModelComponentInfo
from ...models.registry import registry
from ...pipeline.labels import EMOTION_LABELS
from ...core.config import settings

router = APIRouter()


@router.get("/model/info", response_model=ModelInfoResponse)
async def model_info() -> ModelInfoResponse:
    return ModelInfoResponse(
        model_name="emotion-classification-service",
        model_version=settings.app_version,
        detector=ModelComponentInfo(name="face-detector", loaded=registry.detector.loaded),
        classifier=ModelComponentInfo(name="emotion-classifier", loaded=registry.classifier.loaded),
        labels=EMOTION_LABELS,
        input_type=["image", "frame"],
        supports_multiple_faces=True,
    )
