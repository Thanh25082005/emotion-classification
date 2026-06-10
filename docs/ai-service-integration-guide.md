# AI Service Integration Guide

## What Is the AI Service?

The AI Service is a separate Python microservice responsible for all machine learning inference. It runs on **port 9000** and is called exclusively by the backend — the frontend never communicates with it directly.

The backend already has a complete HTTP client (`apps/backend/src/clients/ai_service.py`) that calls the four endpoints described in this guide. Your job is to implement those endpoints so the system works end-to-end.

The backend handles AI Service unavailability gracefully: if the service is down, the backend returns a `503` to API callers and a `session.error` event to WebSocket clients. This means you can develop and test the AI Service independently without breaking anything else.

---

## What You Need to Implement

You must implement exactly **4 HTTP endpoints**:

| Method | Path                                 | Purpose                                       |
|--------|--------------------------------------|-----------------------------------------------|
| GET    | `/internal/v1/health`                | Health/readiness probe                        |
| GET    | `/internal/v1/model/info`            | Return model metadata                         |
| POST   | `/internal/v1/inference/image`       | Analyze a static image file                  |
| POST   | `/internal/v1/inference/frame`       | Analyze a single video frame (realtime path) |

All paths use the `/internal/` prefix to make it clear they are not public-facing endpoints.

---

## Step-by-Step Integration

### Step 1: Create the Project

```bash
mkdir -p services/ai-service
cd services/ai-service
```

Suggested directory structure:

```
services/ai-service/
├── src/
│   ├── main.py          # FastAPI app factory
│   ├── router.py        # All 4 endpoints
│   ├── inference.py     # Model loading and inference logic
│   └── schemas.py       # Pydantic request/response models
├── models/              # Store model weights here (gitignored)
├── requirements.txt
└── Dockerfile
```

### Step 2: Install Dependencies

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install fastapi uvicorn[standard] pillow opencv-python-headless
```

Choose one inference backend:

```bash
# PyTorch (recommended for most pretrained models)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# TensorFlow / Keras
pip install tensorflow

# ONNX Runtime (lightweight, fast)
pip install onnxruntime
```

### Step 3: Implement `GET /internal/v1/health`

This endpoint is called by the backend before each inference request to check readiness, and by Docker health checks.

```python
@router.get("/internal/v1/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": model_is_loaded()   # True/False
    }
```

Return `200 OK` when the model is loaded and ready. Return `503` if the model has not finished loading yet.

### Step 4: Implement `GET /internal/v1/model/info`

Returns metadata about the currently loaded model.

```python
@router.get("/internal/v1/model/info")
async def model_info():
    return {
        "model_name": "fer2013-resnet",       # or whatever you use
        "version": "1.0.0",
        "emotions": [
            "happy", "sad", "angry",
            "surprised", "fearful", "disgusted", "neutral"
        ],
        "input_size": [48, 48],               # expected face crop size
        "framework": "pytorch"                # or "tensorflow", "onnx"
    }
```

### Step 5: Implement `POST /internal/v1/inference/image`

Receives a static image file uploaded by the user.

**Request:** `multipart/form-data`

| Field        | Type   | Description                                    |
|--------------|--------|------------------------------------------------|
| `file`       | file   | The image file (JPEG, PNG, WebP)               |
| `request_id` | string | UUID string; echo it back in the response      |
| `user_id`    | string | UUID of the requesting user; for logging only  |

**Response:** `200 OK`, `application/json`

```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "face_count": 2,
  "faces": [
    {
      "face_id": 0,
      "bounding_box": { "x": 120, "y": 45, "width": 180, "height": 200 },
      "confidence": 0.98,
      "dominant_emotion": "happy",
      "emotions": {
        "happy":     0.85,
        "neutral":   0.08,
        "sad":       0.03,
        "angry":     0.02,
        "surprised": 0.01,
        "fearful":   0.005,
        "disgusted": 0.005
      }
    },
    {
      "face_id": 1,
      "bounding_box": { "x": 400, "y": 60, "width": 160, "height": 185 },
      "confidence": 0.94,
      "dominant_emotion": "neutral",
      "emotions": {
        "happy":     0.10,
        "neutral":   0.75,
        "sad":       0.05,
        "angry":     0.04,
        "surprised": 0.03,
        "fearful":   0.015,
        "disgusted": 0.015
      }
    }
  ],
  "processing_time_ms": 112
}
```

If no faces are detected, return `face_count: 0` and `faces: []` — **not** an error.

**Skeleton implementation:**

```python
from fastapi import APIRouter, UploadFile, File, Form
import time, io
from PIL import Image

router = APIRouter()

@router.post("/internal/v1/inference/image")
async def inference_image(
    file: UploadFile = File(...),
    request_id: str = Form(...),
    user_id: str = Form(...)
):
    start = time.time()
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")

    faces = detect_and_classify(image)   # your implementation

    elapsed_ms = int((time.time() - start) * 1000)
    return {
        "request_id": request_id,
        "face_count": len(faces),
        "faces": faces,
        "processing_time_ms": elapsed_ms
    }
```

### Step 6: Implement `POST /internal/v1/inference/frame`

Functionally identical to the image endpoint, but accepts a base64-encoded frame string instead of a file upload. Used by the realtime WebSocket path.

**Request:** `application/json`

```json
{
  "frame": "<base64-encoded JPEG string>",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "timestamp": 1749561600000
}
```

**Response:** Same format as the image endpoint.

**Skeleton implementation:**

```python
import base64

@router.post("/internal/v1/inference/frame")
async def inference_frame(body: FrameRequest):
    start = time.time()
    frame_bytes = base64.b64decode(body.frame)
    image = Image.open(io.BytesIO(frame_bytes)).convert("RGB")

    faces = detect_and_classify(image)

    elapsed_ms = int((time.time() - start) * 1000)
    return {
        "request_id": body.request_id,
        "face_count": len(faces),
        "faces": faces,
        "processing_time_ms": elapsed_ms
    }
```

### Step 7: Start the Service on Port 9000

```bash
# From services/ai-service/
uvicorn src.main:app --host 0.0.0.0 --port 9000 --reload
```

### Step 8: Configure the Backend

In `apps/backend/.env`, set:

```
AI_SERVICE_BASE_URL=http://localhost:9000
```

When running with Docker Compose, the service name is used instead:

```
AI_SERVICE_BASE_URL=http://ai-service:9000
```

---

## Required Response Formats

All emotion probability maps must:
- Include all 7 emotion keys: `happy`, `sad`, `angry`, `surprised`, `fearful`, `disgusted`, `neutral`.
- Have values in the range `[0.0, 1.0]`.
- Sum to approximately `1.0` (within floating-point precision).

The `dominant_emotion` field must be the key with the highest value in the `emotions` map.

---

## Error Handling

The backend expects standard HTTP status codes. Do not return `200 OK` for errors.

| Situation                         | HTTP Status | Example body                                          |
|-----------------------------------|-------------|-------------------------------------------------------|
| Model not loaded / warming up     | `503`       | `{"detail": "Model is not ready"}`                   |
| File too large (> 10 MB)          | `413`       | `{"detail": "File too large"}`                       |
| Unsupported image format          | `422`       | `{"detail": "Unsupported image format"}`             |
| Corrupted image / decode failure  | `400`       | `{"detail": "Could not decode image"}`               |
| Internal inference error          | `500`       | `{"detail": "Inference failed: <reason>"}`           |

FastAPI's default exception handling returns these in the correct format automatically when you use `raise HTTPException(status_code=..., detail=...)`.

---

## Testing with curl

Once the service is running on port 9000:

```bash
# 1. Health check
curl http://localhost:9000/internal/v1/health

# 2. Model info
curl http://localhost:9000/internal/v1/model/info

# 3. Image inference
curl -X POST http://localhost:9000/internal/v1/inference/image \
  -F "file=@/path/to/your/photo.jpg" \
  -F "request_id=test-request-001" \
  -F "user_id=test-user-001"

# 4. Frame inference (base64 encode an image first)
BASE64=$(base64 -w 0 /path/to/your/photo.jpg)
curl -X POST http://localhost:9000/internal/v1/inference/frame \
  -H "Content-Type: application/json" \
  -d "{
    \"frame\": \"$BASE64\",
    \"request_id\": \"test-frame-001\",
    \"user_id\": \"test-user-001\",
    \"timestamp\": $(date +%s%3N)
  }"
```

---

## Docker

The `docker-compose.yml` at the project root contains a commented-out `ai-service` section. Once your service has a `Dockerfile`, uncomment it:

```yaml
# In docker-compose.yml, uncomment:
  ai-service:
    build:
      context: ./services/ai-service
      dockerfile: Dockerfile
    ports:
      - "9000:9000"
    environment:
      - MODEL_PATH=/app/models/emotion_model.pth
    volumes:
      - ./services/ai-service/models:/app/models
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/internal/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

A minimal `Dockerfile` for the AI Service:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "9000"]
```

---

## Do NOT Touch

The following parts of the codebase are outside the scope of AI Service implementation. Do not modify them:

- `apps/backend/` — backend authentication, routing, WebSocket manager, or database models.
- `apps/frontend/` — any frontend page, component, or service.
- `packages/` — shared type definitions and API contracts.
- `docker-compose.yml` — other than uncommenting the `ai-service` block.
- Any existing Alembic migration files.

If you believe a change to these areas is necessary, discuss with the team first.

---

## Full API Contract

The machine-readable API contract is located at:

```
packages/shared/api-contracts/ai-service-contract.md
```

This document is the authoritative reference for request/response schemas and supersedes any examples in this guide if there is a conflict.
