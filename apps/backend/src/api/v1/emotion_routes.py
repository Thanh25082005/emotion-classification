import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from ...core.database import get_db
from ...core.security import get_current_user, require_upload_permission
from ...models.user import User
from ...models.emotion_result import EmotionResult
from ...clients.ai_service_client import predict_image as ai_predict_image, AIServiceError
from ...schemas.emotion_schema import (
    EmotionResultResponse,
    EmotionResultListResponse,
    PredictResponse,
    FaceResultSchema,
    BoundingBox,
    EmotionScores,
)
from ...core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/emotions", tags=["emotions"])


def _parse_faces(faces_raw: list) -> list[FaceResultSchema]:
    results = []
    for f in faces_raw:
        box_raw = f.get("box")
        box = BoundingBox(**box_raw) if box_raw else None
        scores_raw = f.get("scores", {})
        scores = EmotionScores(**{k: scores_raw.get(k, 0.0) for k in EmotionScores.model_fields})
        results.append(
            FaceResultSchema(
                face_id=f.get("face_id", "face-1"),
                box=box,
                emotion=f.get("emotion", ""),
                confidence=f.get("confidence", 0.0),
                scores=scores,
            )
        )
    return results


@router.post("/predict", response_model=PredictResponse, status_code=201)
async def predict(
    file: UploadFile = File(...),
    current_user: User = Depends(require_upload_permission),
    db: AsyncSession = Depends(get_db),
):
    request_id = str(uuid.uuid4())
    image_bytes = await file.read()

    try:
        ai_result = await ai_predict_image(image_bytes, request_id=request_id, user_id=current_user.id)
    except AIServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": e.code, "message": e.message},
        )

    if ai_result.get("status") == "error":
        err = ai_result.get("error", {})
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": err.get("code", "AI_SERVICE_ERROR"), "message": err.get("message", "")},
        )

    faces_raw = ai_result.get("faces", [])
    dominant_emotion = faces_raw[0].get("emotion", "") if faces_raw else ""
    confidence = faces_raw[0].get("confidence", 0.0) if faces_raw else 0.0

    record = EmotionResult(
        user_id=current_user.id,
        source_type="image",
        faces=faces_raw,
        dominant_emotion=dominant_emotion,
        confidence=confidence,
        processing_time_ms=ai_result.get("processing_time_ms"),
        ai_service_version="1.0.0",
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)

    return PredictResponse(
        success=True,
        data=EmotionResultResponse(
            id=record.id,
            user_id=record.user_id,
            source_type=record.source_type,
            faces=_parse_faces(faces_raw),
            dominant_emotion=record.dominant_emotion,
            confidence=record.confidence,
            processing_time_ms=record.processing_time_ms,
            created_at=record.created_at,
        ),
    )


@router.get("/history", response_model=EmotionResultListResponse)
async def get_history(
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    count_result = await db.execute(
        select(func.count()).select_from(EmotionResult).where(EmotionResult.user_id == current_user.id)
    )
    total = count_result.scalar_one()

    result = await db.execute(
        select(EmotionResult)
        .where(EmotionResult.user_id == current_user.id)
        .order_by(desc(EmotionResult.created_at))
        .limit(limit)
        .offset(offset)
    )
    records = result.scalars().all()

    return EmotionResultListResponse(
        success=True,
        total=total,
        data=[
            EmotionResultResponse(
                id=r.id,
                user_id=r.user_id,
                source_type=r.source_type,
                faces=_parse_faces(r.faces or []),
                dominant_emotion=r.dominant_emotion,
                confidence=r.confidence,
                processing_time_ms=r.processing_time_ms,
                created_at=r.created_at,
            )
            for r in records
        ],
    )


@router.get("/statistics")
async def get_statistics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    total_result = await db.execute(
        select(func.count()).select_from(EmotionResult).where(EmotionResult.user_id == current_user.id)
    )
    total = total_result.scalar_one()

    latest_result = await db.execute(
        select(EmotionResult)
        .where(EmotionResult.user_id == current_user.id)
        .order_by(desc(EmotionResult.created_at))
        .limit(1)
    )
    latest = latest_result.scalar_one_or_none()

    return {
        "success": True,
        "data": {
            "total_predictions": total,
            "latest_emotion": latest.dominant_emotion if latest else None,
            "latest_confidence": latest.confidence if latest else None,
            "latest_at": latest.created_at.isoformat() if latest else None,
        },
    }


@router.get("/{result_id}")
async def get_result(
    result_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EmotionResult).where(
            EmotionResult.id == result_id,
            EmotionResult.user_id == current_user.id,
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Result not found"})

    return {
        "success": True,
        "data": EmotionResultResponse(
            id=record.id,
            user_id=record.user_id,
            source_type=record.source_type,
            faces=_parse_faces(record.faces or []),
            dominant_emotion=record.dominant_emotion,
            confidence=record.confidence,
            processing_time_ms=record.processing_time_ms,
            created_at=record.created_at,
        ),
    }


@router.delete("/{result_id}", status_code=204)
async def delete_result(
    result_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EmotionResult).where(
            EmotionResult.id == result_id,
            EmotionResult.user_id == current_user.id,
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Result not found"})
    await db.delete(record)
