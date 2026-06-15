"""
WebSocket realtime: /ws/emotion

Hop dong (muc 6.2):
- Client -> Server: moi message la BINARY = anh JPEG da encode (1 frame).
- Server -> Client: moi message la TEXT JSON:
    {"faces":[{"box":[x1,y1,x2,y2],"emotion":"happy","score":0.93}], "ts": <ms>}
  Toa do box theo kich thuoc frame goc client gui len.

Phase 4: verify JWT qua query param ?token= TRUOC khi accept;
token sai/thieu -> dong ket noi voi code 1008 (policy violation).
"""
import asyncio
import time
from collections import Counter

import cv2
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from starlette.concurrency import run_in_threadpool

from app.core.security import decode_token
from app.db.database import SessionLocal
from app.models.log import EmotionLog
from app.models.user import User
from app.services.inference import get_pipeline

router = APIRouter()

WS_POLICY_VIOLATION = 1008  # token sai/thieu
LOG_INTERVAL_SEC = 2.0  # toi da ~1 ban ghi / 2 giay cho moi ket noi (KHONG ghi tung frame)


def _write_log(user_id: int, emotion: str, confidence: float) -> None:
    """Ghi 1 ban ghi emotion_logs (chay trong threadpool de khong chen event loop)."""
    db = SessionLocal()
    try:
        db.add(EmotionLog(user_id=user_id, emotion=emotion, confidence=confidence))
        db.commit()
    finally:
        db.close()


def _authenticate(token: str | None) -> User | None:
    """Tra ve User neu token hop le, nguoc lai None."""
    if not token:
        return None
    username = decode_token(token)
    if username is None:
        return None
    db = SessionLocal()
    try:
        return db.scalar(select(User).where(User.username == username))
    finally:
        db.close()


def _build_payload(faces: list[dict]) -> dict:
    """Chuyen ket qua predict() sang dung dinh dang hop dong WS (ep ve int/float thuan de JSON hoa)."""
    return {
        "faces": [
            {
                "box": [int(v) for v in f["box"]],
                "emotion": f["emotion"],
                "score": round(float(f["score"]), 4),
            }
            for f in faces
        ],
        "ts": int(time.time() * 1000),
    }


@router.websocket("/ws/emotion")
async def emotion_ws(websocket: WebSocket, token: str | None = None):
    # Verify token (truyen qua query param ?token=) TRUOC khi xu ly bat ky frame nao.
    user = _authenticate(token)
    if user is None:
        # Luu y ASGI: phai accept() roi close() moi gui duoc dung MA DONG 1008 ve client.
        # Neu close() truoc accept(), uvicorn tra HTTP 403 va client KHONG nhan duoc code 1008.
        await websocket.accept()
        await websocket.close(code=WS_POLICY_VIOLATION)
        return

    await websocket.accept()
    pipeline = get_pipeline()

    # Buffer cam xuc trong khoang LOG_INTERVAL_SEC de ghi theo MAU (khong ghi tung frame)
    buffer: list[tuple[str, float]] = []
    last_log = time.time()

    # Producer/consumer: 1 task lien tuc nhan frame va ghi de vao o "moi nhat";
    # vong xu ly luon lay frame MOI NHAT -> bo qua frame cu, KHONG bao gio bi tre don.
    latest: dict[str, bytes | None] = {"data": None}
    stop = asyncio.Event()

    async def receiver():
        try:
            while True:
                latest["data"] = await websocket.receive_bytes()
        except WebSocketDisconnect:
            stop.set()

    recv_task = asyncio.create_task(receiver())
    try:
        while not stop.is_set():
            data = latest["data"]
            if data is None:
                await asyncio.sleep(0.005)  # chua co frame moi -> nhuong event loop
                continue
            latest["data"] = None  # tieu thu frame moi nhat

            arr = np.frombuffer(data, dtype=np.uint8)
            frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if frame is None:
                continue  # frame hong -> bo qua

            # predict() la CPU-bound -> chay o threadpool de khong chen event loop
            faces = await run_in_threadpool(pipeline.predict, frame)
            await websocket.send_json(_build_payload(faces))

            # Gom ket qua de tinh cam xuc noi troi cua khoang
            for f in faces:
                buffer.append((f["emotion"], float(f["score"])))

            now = time.time()
            if now - last_log >= LOG_INTERVAL_SEC and buffer:
                counts = Counter(emotion for emotion, _ in buffer)
                dominant = counts.most_common(1)[0][0]  # cam xuc xuat hien nhieu nhat
                scores = [s for emotion, s in buffer if emotion == dominant]
                confidence = sum(scores) / len(scores)  # confidence trung binh cua cam xuc do
                await run_in_threadpool(_write_log, user.id, dominant, confidence)
                buffer.clear()
                last_log = now
    except WebSocketDisconnect:
        pass  # client dong ket noi binh thuong
    finally:
        stop.set()
        recv_task.cancel()
