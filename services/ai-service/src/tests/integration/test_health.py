import pytest
from fastapi.testclient import TestClient
from src.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/internal/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "ai-service"


def test_model_info_endpoint():
    response = client.get("/internal/v1/model/info")
    assert response.status_code == 200
    data = response.json()
    assert "detector" in data
    assert "classifier" in data
    assert "labels" in data
    assert len(data["labels"]) == 7


def test_inference_image_no_input():
    response = client.post("/internal/v1/inference/image")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "error"
