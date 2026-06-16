import uuid
import json
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from ...core.database import AsyncSessionLocal
from ...core.security import decode_token
from ...models.user import User
from ...models.emotion_result import EmotionResult
from ...models.realtime_session import RealtimeSession
from ...clients.ai_service_client import predict_frame as ai_predict_frame, AIServiceError
from ...core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/realtime", tags=["realtime"])


async def _get_user_from_token(token: str) -> User | None:
    user_id = decode_token(token)
    if not user_id:
        return None
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
        return result.scalar_one_or_none()


@router.websocket("/emotions")
async def realtime_emotions(websocket: WebSocket):
    await websocket.accept()
    session_db_id: str | None = None
    user: User | None = None

    try:
        auth_msg = await websocket.receive_text()
        auth_data = json.loads(auth_msg)
        token = auth_data.get("token", "")
        user = await _get_user_from_token(token)

        if not user:
            await websocket.send_text(json.dumps({
                "event": "auth.error",
                "data": {"code": "UNAUTHORIZED", "message": "Invalid token"},
            }))
            await websocket.close(code=4001)
            return

        async with AsyncSessionLocal() as db:
            session = RealtimeSession(user_id=user.id)
            db.add(session)
            await db.commit()
            await db.refresh(session)
            session_db_id = session.id

        await websocket.send_text(json.dumps({
            "event": "auth.success",
            "data": {"session_id": session_db_id, "user_id": user.id},
        }))

        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            event = msg.get("event")

            if event != "emotion.frame":
                continue

            data = msg.get("data", {})
            request_id = data.get("request_id") or str(uuid.uuid4())
            session_id = data.get("session_id") or session_db_id
            frame_base64 = data.get("frame_base64", "")
            timestamp = data.get("timestamp") or datetime.now(timezone.utc).isoformat()

            if not frame_base64:
                await websocket.send_text(json.dumps({
                    "event": "emotion.error",
                    "data": {"request_id": request_id, "code": "INVALID_IMAGE", "message": "Missing frame_base64"},
                }))
                continue

            try:
                ai_result = await ai_predict_frame(
                    frame_base64=frame_base64,
                    request_id=request_id,
                    session_id=session_id,
                    user_id=user.id,
                    timestamp=timestamp,
                )
            except AIServiceError as e:
                await websocket.send_text(json.dumps({
                    "event": "emotion.error",
                    "data": {"request_id": request_id, "code": e.code, "message": e.message},
                }))
                continue

            if ai_result.get("status") == "error":
                err = ai_result.get("error", {})
                await websocket.send_text(json.dumps({
                    "event": "emotion.error",
                    "data": {
                        "request_id": request_id,
                        "code": err.get("code", "AI_ERROR"),
                        "message": err.get("message", ""),
                    },
                }))
                continue

            faces_raw = ai_result.get("faces", [])
            dominant_emotion = faces_raw[0].get("emotion", "") if faces_raw else ""
            confidence = faces_raw[0].get("confidence", 0.0) if faces_raw else 0.0

            result_id = str(uuid.uuid4())
            async with AsyncSessionLocal() as db:
                record = EmotionResult(
                    id=result_id,
                    user_id=user.id,
                    source_type="frame",
                    faces=faces_raw,
                    dominant_emotion=dominant_emotion,
                    confidence=confidence,
                    processing_time_ms=ai_result.get("processing_time_ms"),
                    ai_service_version="1.0.0",
                    session_id=session_db_id,
                )
                db.add(record)
                await db.commit()

                if session_db_id:
                    await db.execute(
                        update(RealtimeSession)
                        .where(RealtimeSession.id == session_db_id)
                        .values(frame_count=RealtimeSession.frame_count + 1)
                    )
                    await db.commit()

            await websocket.send_text(json.dumps({
                "event": "emotion.result",
                "data": {
                    "request_id": request_id,
                    "session_id": session_db_id,
                    "result_id": result_id,
                    "faces": faces_raw,
                    "processing_time_ms": ai_result.get("processing_time_ms"),
                    "created_at": datetime.now(timezone.utc).isoformat(),
                },
            }))

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected user=%s", user.id if user else "unknown")
    except Exception as e:
        logger.exception("WebSocket error: %s", e)
    finally:
        if session_db_id:
            async with AsyncSessionLocal() as db:
                await db.execute(
                    update(RealtimeSession)
                    .where(RealtimeSession.id == session_db_id)
                    .values(is_active=False, ended_at=datetime.now(timezone.utc))
                )
                await db.commit()
