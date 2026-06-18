"""
Test co ban (Phase 6): 1 test health, 1 test auth, 1 test WebSocket.
Dung FastAPI TestClient (chay app in-process, tu kich hoat lifespan -> nap model that).

Chay:
    cd backend && python -m pytest -v
"""
import os
import tempfile

# Dung DB tam rieng cho test (set TRUOC khi import app de settings doc duoc).
_TMP_DB = os.path.join(tempfile.gettempdir(), "emotion_pytest.db")
if os.path.exists(_TMP_DB):
    os.remove(_TMP_DB)
os.environ["DB_URL"] = f"sqlite:///{_TMP_DB}"
os.environ["SECRET_KEY"] = "pytest-secret"

import cv2  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from ultralytics.utils import ASSETS  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="module")
def client():
    # Context manager kich hoat lifespan: tao bang DB + nap EmotionPipeline 1 lan.
    with TestClient(app) as c:
        yield c


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_auth_flow(client):
    creds = {"username": "pytest_user", "password": "matkhau123"}

    r = client.post("/api/auth/register", json=creds)
    assert r.status_code == 201
    assert r.json()["username"] == creds["username"]

    # Dang ky trung -> 409
    assert client.post("/api/auth/register", json=creds).status_code == 409

    r = client.post("/api/auth/login", json=creds)
    assert r.status_code == 200
    token = r.json()["access_token"]
    assert r.json()["token_type"] == "bearer"

    # /me voi token hop le
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200 and r.json()["username"] == creds["username"]

    # /me khong token -> 401
    assert client.get("/api/auth/me").status_code == 401


def _get_token(client):
    creds = {"username": "ws_user", "password": "matkhau123"}
    client.post("/api/auth/register", json=creds)
    return client.post("/api/auth/login", json=creds).json()["access_token"]


def test_websocket_emotion(client):
    token = _get_token(client)

    # Encode 1 anh mau thanh JPEG
    frame = cv2.imread(str(ASSETS / "zidane.jpg"))
    ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
    assert ok

    with client.websocket_connect(f"/ws/emotion?token={token}") as ws:
        ws.send_bytes(buf.tobytes())
        msg = ws.receive_json()

    # Dung dinh dang hop dong 6.2
    assert "faces" in msg and "ts" in msg
    assert isinstance(msg["ts"], int)
    for f in msg["faces"]:
        assert set(f) == {"box", "emotion", "score"}
        assert len(f["box"]) == 4 and all(isinstance(v, int) for v in f["box"])
        assert isinstance(f["emotion"], str)


def test_websocket_bad_token(client):
    # Token sai -> ket noi bi tu choi (dong ngay, khong nhan duoc du lieu).
    from starlette.websockets import WebSocketDisconnect

    with pytest.raises(WebSocketDisconnect) as exc:
        with client.websocket_connect("/ws/emotion?token=sai_bet") as ws:
            ws.receive_json()
    assert exc.value.code == 1008
