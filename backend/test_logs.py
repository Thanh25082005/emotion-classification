"""
Kiem tra Phase 5: dung realtime mot luc -> backend ghi log theo mau (<=1/2s)
-> GET /api/logs/stats tra tong hop dung. Yeu cau backend dang chay o cong 8000.

Cach dung:
    python backend/test_logs.py
"""
import asyncio
import json
import sys
import time
import urllib.request

import cv2
import websockets

API = "http://localhost:8000/api"
WS = "ws://localhost:8000/ws/emotion"
SEND_SECONDS = 5.0        # gui frame trong ~5s -> du de sinh >=2 ban ghi (moi 2s)
SEND_INTERVAL = 0.15      # ~6-7 fps giong client that


def http(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, method=method)
    if body is not None:
        req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req) as r:
        return r.status, json.loads(r.read() or "null")


async def stream_frames(token, jpeg):
    sent = 0
    async with websockets.connect(WS + f"?token={token}") as ws:
        t0 = time.time()
        while time.time() - t0 < SEND_SECONDS:
            await ws.send(jpeg)
            await ws.recv()  # nhan ket qua de khong don ung
            sent += 1
            await asyncio.sleep(SEND_INTERVAL)
    return sent


async def main():
    uname = f"loguser_{int(time.time())}"
    http("POST", "/auth/register", {"username": uname, "password": "matkhau123"})
    _, b = http("POST", "/auth/login", {"username": uname, "password": "matkhau123"})
    token = b["access_token"]

    # stats ban dau = 0
    _, s0 = http("GET", "/logs/stats", token=token)
    print(f"stats truoc khi chay: total={s0['total']}")

    from ultralytics.utils import ASSETS
    frame = cv2.imread(str(ASSETS / "zidane.jpg"))
    _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
    sent = await stream_frames(token, buf.tobytes())
    print(f"da gui {sent} frame trong ~{SEND_SECONDS}s")

    # cho 1 nhip de ban ghi cuoi kip commit
    await asyncio.sleep(0.5)
    _, s1 = http("GET", "/logs/stats", token=token)
    print(f"stats sau khi chay: {json.dumps(s1, ensure_ascii=False)}")

    ok_total = s1["total"] >= 1
    ok_shape = isinstance(s1["counts"], dict) and s1["total"] == sum(s1["counts"].values())
    # ghi theo MAU, KHONG tung frame: so ban ghi phai it hon nhieu so frame da gui
    ok_sampled = s1["total"] < sent

    print()
    print(f"  [{'PASS' if ok_total else 'FAIL'}] co it nhat 1 ban ghi")
    print(f"  [{'PASS' if ok_shape else 'FAIL'}] dinh dang {{counts, total}} nhat quan")
    print(f"  [{'PASS' if ok_sampled else 'FAIL'}] ghi theo mau (total={s1['total']} < frame gui={sent})")

    if ok_total and ok_shape and ok_sampled:
        print("\nKET QUA: TAT CA PASS ✅")
    else:
        print("\nKET QUA: CO TEST FAIL ❌")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
