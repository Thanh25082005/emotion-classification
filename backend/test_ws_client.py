"""
Script kiem tra Phase 2: gui 1 anh JPEG qua WebSocket /ws/emotion va in JSON nhan ve.
Kiem tra ket qua co dung dinh dang hop dong 6.2 khong.

Yeu cau: backend dang chay (uvicorn app.main:app).

Cach dung:
    python backend/test_ws_client.py                  # dung anh mau zidane.jpg
    python backend/test_ws_client.py /duong/dan.jpg   # anh tu chon
"""
import asyncio
import json
import sys

import cv2
import websockets

WS_URL = "ws://localhost:8000/ws/emotion"


def load_jpeg_bytes(path: str | None) -> bytes:
    if path is None:
        from ultralytics.utils import ASSETS
        path = str(ASSETS / "zidane.jpg")
    frame = cv2.imread(path)
    if frame is None:
        raise SystemExit(f"Khong doc duoc anh: {path}")
    print(f"Anh test: {path} (shape={frame.shape})")
    ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
    if not ok:
        raise SystemExit("Encode JPEG that bai")
    return buf.tobytes()


def validate(msg: dict) -> bool:
    """Kiem tra dung hop dong 6.2."""
    if not isinstance(msg, dict) or "faces" not in msg or "ts" not in msg:
        return False
    if not isinstance(msg["ts"], int) or not isinstance(msg["faces"], list):
        return False
    for f in msg["faces"]:
        if set(f) != {"box", "emotion", "score"}:
            return False
        if not (isinstance(f["box"], list) and len(f["box"]) == 4):
            return False
        if not all(isinstance(v, int) for v in f["box"]):
            return False
        if not isinstance(f["emotion"], str) or not isinstance(f["score"], (int, float)):
            return False
    return True


async def main():
    path = sys.argv[1] if len(sys.argv) > 1 else None
    jpeg = load_jpeg_bytes(path)

    async with websockets.connect(WS_URL) as ws:
        await ws.send(jpeg)  # binary
        raw = await ws.recv()
        print("\n--- JSON nhan ve ---")
        print(raw)
        msg = json.loads(raw)
        ok = validate(msg)
        print("\n--- Ket qua kiem tra dinh dang ---")
        print("HOP LE ✅" if ok else "SAI DINH DANG ❌")
        print(f"So khuon mat: {len(msg.get('faces', []))}")
        if not ok:
            raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(main())
