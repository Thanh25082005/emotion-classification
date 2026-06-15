"""
Kiem tra Phase 4 (auth) end-to-end: register/login/me + WebSocket tu choi token sai,
chap nhan token dung. Yeu cau backend dang chay o cong 8000.

Cach dung:
    python backend/test_auth.py
"""
import asyncio
import json
import sys
import time
import urllib.error
import urllib.request

import cv2
import websockets

API = "http://localhost:8000/api"
WS = "ws://localhost:8000/ws/emotion"


def http(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, method=method)
    if body is not None:
        req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read() or "null")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or "null")


def check(name, cond):
    print(f"  [{'PASS' if cond else 'FAIL'}] {name}")
    if not cond:
        check.failed = True


check.failed = False


async def ws_bad_token():
    """Token sai -> phai dong voi code 1008."""
    try:
        async with websockets.connect(WS + "?token=sai_bet") as ws:
            await ws.recv()  # khong nen nhan duoc gi
        return None
    except websockets.exceptions.ConnectionClosed as e:
        return e.code
    except Exception:
        return "error"


async def ws_good_token(token):
    """Token dung -> nhan ve JSON dung dinh dang."""
    from ultralytics.utils import ASSETS
    frame = cv2.imread(str(ASSETS / "zidane.jpg"))
    ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
    async with websockets.connect(WS + f"?token={token}") as ws:
        await ws.send(buf.tobytes())
        msg = json.loads(await ws.recv())
        return msg


async def main():
    uname = f"user_{int(time.time())}"
    pw = "matkhau123"

    print("REST auth:")
    s, b = http("POST", "/auth/register", {"username": uname, "password": pw})
    check("register -> 201 + {id, username}", s == 201 and "id" in b and b["username"] == uname)

    s, _ = http("POST", "/auth/register", {"username": uname, "password": pw})
    check("register trung -> 409", s == 409)

    s, b = http("POST", "/auth/login", {"username": uname, "password": pw})
    check("login dung -> 200 + access_token", s == 200 and b.get("token_type") == "bearer" and b.get("access_token"))
    token = b.get("access_token")

    s, _ = http("POST", "/auth/login", {"username": uname, "password": "sai"})
    check("login sai mat khau -> 401", s == 401)

    s, b = http("GET", "/auth/me", token=token)
    check("me (co token) -> 200 + username", s == 200 and b.get("username") == uname)

    s, _ = http("GET", "/auth/me")
    check("me (khong token) -> 401", s == 401)

    print("WebSocket:")
    code = await ws_bad_token()
    check(f"WS token sai -> dong code 1008 (nhan: {code})", code == 1008)

    msg = await ws_good_token(token)
    ok = isinstance(msg, dict) and "faces" in msg and "ts" in msg
    check(f"WS token dung -> JSON dung dinh dang ({len(msg.get('faces', []))} mat)", ok)

    print()
    if check.failed:
        print("KET QUA: CO TEST FAIL ❌")
        sys.exit(1)
    print("KET QUA: TAT CA PASS ✅")


if __name__ == "__main__":
    asyncio.run(main())
