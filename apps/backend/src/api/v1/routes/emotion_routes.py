import uuid
from fastapi import APIRouter, UploadFile, File, Query
from ....api.v1.schemas.emotion_schema import (
    EmotionResultResponse, EmotionHistoryResponse, EmotionStatisticsResponse,
)
from ....api.v1.dependencies import CurrentUser, DBSession
from ....modules.emotions.service import EmotionService

router = APIRouter()


@router.post("/predict", response_model=EmotionResultResponse)
async def predict_emotion(
    current_user: CurrentUser,
    db: DBSession,
    file: UploadFile = File(...),
    source_type: str = Query(default="image", pattern="^(image|frame)$"),
):
    return await EmotionService(db).predict(current_user, file, source_type)


@router.get("/history", response_model=EmotionHistoryResponse)
async def get_emotion_history(
    current_user: CurrentUser,
    db: DBSession,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    return await EmotionService(db).get_history(current_user, page, page_size)


@router.get("/statistics", response_model=EmotionStatisticsResponse)
async def get_statistics(current_user: CurrentUser, db: DBSession):
    return await EmotionService(db).get_statistics(current_user)


@router.get("/{emotion_result_id}", response_model=EmotionResultResponse)
async def get_emotion_result(
    emotion_result_id: uuid.UUID,
    current_user: CurrentUser,
    db: DBSession,
):
    return await EmotionService(db).get_by_id(current_user, emotion_result_id)


@router.delete("/{emotion_result_id}", status_code=204)
async def delete_emotion_result(
    emotion_result_id: uuid.UUID,
    current_user: CurrentUser,
    db: DBSession,
):
    await EmotionService(db).delete(current_user, emotion_result_id)
