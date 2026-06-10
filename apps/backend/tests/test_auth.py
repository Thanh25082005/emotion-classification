import pytest
import io
from httpx import AsyncClient

REGISTER_DATA = {
    "email": "test@example.com",
    "password": "password123",
    "full_name": "Test User",
}


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    response = await client.post("/api/v1/auth/register", json=REGISTER_DATA)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == REGISTER_DATA["email"]
    assert data["full_name"] == REGISTER_DATA["full_name"]
    assert "password_hash" not in data
    assert "id" in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    await client.post("/api/v1/auth/register", json=REGISTER_DATA)
    response = await client.post("/api/v1/auth/register", json=REGISTER_DATA)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "USER_ALREADY_EXISTS"


@pytest.mark.asyncio
async def test_register_short_password(client: AsyncClient):
    response = await client.post("/api/v1/auth/register", json={
        **REGISTER_DATA, "password": "short"
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    await client.post("/api/v1/auth/register", json=REGISTER_DATA)
    response = await client.post("/api/v1/auth/login", json={
        "email": REGISTER_DATA["email"],
        "password": REGISTER_DATA["password"],
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == REGISTER_DATA["email"]
    assert "password_hash" not in data["user"]


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post("/api/v1/auth/register", json=REGISTER_DATA)
    response = await client.post("/api/v1/auth/login", json={
        "email": REGISTER_DATA["email"],
        "password": "wrongpassword",
    })
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_login_unknown_email(client: AsyncClient):
    response = await client.post("/api/v1/auth/login", json={
        "email": "nobody@example.com",
        "password": "password123",
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me_authenticated(client: AsyncClient):
    await client.post("/api/v1/auth/register", json=REGISTER_DATA)
    login_resp = await client.post("/api/v1/auth/login", json={
        "email": REGISTER_DATA["email"],
        "password": REGISTER_DATA["password"],
    })
    token = login_resp.json()["access_token"]
    response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == REGISTER_DATA["email"]


@pytest.mark.asyncio
async def test_get_me_unauthenticated(client: AsyncClient):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_predict_ai_service_unavailable(client: AsyncClient):
    await client.post("/api/v1/auth/register", json=REGISTER_DATA)
    login_resp = await client.post("/api/v1/auth/login", json={
        "email": REGISTER_DATA["email"],
        "password": REGISTER_DATA["password"],
    })
    token = login_resp.json()["access_token"]
    fake_image = io.BytesIO(b"fake image data")
    response = await client.post(
        "/api/v1/emotions/predict",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("test.jpg", fake_image, "image/jpeg")},
    )
    # AI Service not running — expect 503
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "AI_SERVICE_UNAVAILABLE"
