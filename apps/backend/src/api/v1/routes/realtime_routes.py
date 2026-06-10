import uuid
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy import select
from ....core.security import decode_token
from ....db.session import async_session_factory
from ....db.models.user import User
from ....modules.realtime.manager import ConnectionManager
from ....modules.emotions.service import EmotionService
from ....core.logger import get_logger

router = APIRouter()
manager = ConnectionManager()
logger = get_logger(__name__)


@router.websocket("/emotions")
async def websocket_emotion(websocket: WebSocket, token: str = Query(...)):
    session_id = str(uuid.uuid4())
    user = None

    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            await websocket.close(code=4001, reason="Invalid token type")
            return
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001, reason="Invalid token")
            return

        async with async_session_factory() as db:
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()

        if not user or not user.is_active:
            await websocket.close(code=4001, reason="User not found or inactive")
            return

    except Exception:
        await websocket.close(code=4001, reason="Authentication failed")
        return

    await manager.connect(websocket, session_id, str(user.id))
    logger.info(f"WebSocket connected: session={session_id} user={user.id}")

    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                event = message.get("event")
                payload_data = message.get("data", {})

                if event == "emotion.frame":
                    frame_base64 = payload_data.get("frame_base64")
                    if not frame_base64:
                        await manager.send_error(session_id, "MISSING_FRAME", "frame_base64 is required")
                        continue

                    async with async_session_factory() as db:
                        result = await EmotionService(db).predict_from_base64(
                            user, frame_base64, "realtime"
                        )
                    await manager.send_result(session_id, result)

                elif event == "ping":
                    await manager.send_personal(session_id, {"event": "pong"})

            except json.JSONDecodeError:
                await manager.send_error(session_id, "INVALID_JSON", "Invalid JSON message")
            except Exception as e:
                logger.error(f"Error processing WebSocket message: {e}")
                await manager.send_error(session_id, "PROCESSING_ERROR", str(e))

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: session={session_id}")
    finally:
        manager.disconnect(session_id)
