"""
WebSocket realtime: /ws/emotion

Hop dong (muc 6.2):
- Client -> Server: moi message la BINARY = anh JPEG da encode (1 frame).
- Server -> Client: moi message la TEXT JSON:
    {"faces":[{"box":[x1,y1,x2,y2],"emotion":"happy","score":0.93}], "ts": <ms>}
  Toa do box theo kich thuoc frame goc client gui len.

Phase 2: TAM THOI bo qua token (se bat lai o Phase 4).
"""
import time

import cv2
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.concurrency import run_in_threadpool

from app.services.inference import get_pipeline

router = APIRouter()


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
async def emotion_ws(websocket: WebSocket):
    await websocket.accept()
    pipeline = get_pipeline()
    try:
        while True:
            # Nhan 1 frame JPEG (binary)
            data = await websocket.receive_bytes()
            arr = np.frombuffer(data, dtype=np.uint8)
            frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if frame is None:
                # Frame hong -> bao qua, khong lam dut ket noi
                continue

            # predict() la CPU-bound -> chay o threadpool de khong chen event loop
            faces = await run_in_threadpool(pipeline.predict, frame)
            await websocket.send_json(_build_payload(faces))
    except WebSocketDisconnect:
        # Client dong ket noi binh thuong
        pass
