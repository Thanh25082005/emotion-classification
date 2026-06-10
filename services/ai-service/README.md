# AI Service - Emotion Classifier

## Overview

This service handles facial emotion classification using a deep learning model. The backend calls it via internal HTTP to perform inference on images or video frames. It is a standalone microservice that exposes a set of internal REST endpoints consumed exclusively by the backend service.

The AI service is responsible for:
- Detecting faces in an image or video frame
- Classifying the emotion of each detected face
- Returning bounding box coordinates, emotion labels, and confidence scores

## Port

**9000**

The service listens on `http://0.0.0.0:9000` by default.

---

## Required Endpoints

All endpoints must be implemented. The backend depends on every one of them.

---

### GET /internal/v1/health

Health check endpoint. Used by the backend to verify the AI service is running.

**Response**

```json
{
  "status": "ok",
  "service": "ai-service",
  "version": "1.0.0"
}
```

**Example curl**

```bash
curl http://localhost:9000/internal/v1/health
```

---

### GET /internal/v1/model/info

Returns metadata about the loaded model including supported labels and input types.

**Response**

```json
{
  "model_name": "emotion-classifier",
  "model_version": "1.0.0",
  "labels": ["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"],
  "input_type": ["image", "frame"],
  "supports_multiple_faces": true
}
```

**Fields**

| Field | Type | Description |
|---|---|---|
| `model_name` | string | Name of the loaded model |
| `model_version` | string | Version of the model |
| `labels` | string[] | All possible emotion output labels |
| `input_type` | string[] | Accepted input modes |
| `supports_multiple_faces` | boolean | Whether the model can detect multiple faces per image |

**Example curl**

```bash
curl http://localhost:9000/internal/v1/model/info
```

---

### POST /internal/v1/inference/image

Accepts an image file and returns emotion classification results for all detected faces.

**Request**

- Content-Type: `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | Yes | Image file (JPEG, PNG, etc.) |
| `request_id` | string (UUID) | Yes | Unique request identifier for tracing |
| `user_id` | string (UUID) | Yes | ID of the user who made the request |

**Example curl**

```bash
curl -X POST http://localhost:9000/internal/v1/inference/image \
  -F "file=@/path/to/photo.jpg" \
  -F "request_id=550e8400-e29b-41d4-a716-446655440000" \
  -F "user_id=123e4567-e89b-12d3-a456-426614174000"
```

**Success Response** (HTTP 200)

```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "success",
  "faces": [
    {
      "face_id": "face-1",
      "box": {
        "x": 120,
        "y": 80,
        "width": 160,
        "height": 160
      },
      "emotion": "happy",
      "confidence": 0.92,
      "scores": {
        "angry": 0.01,
        "disgust": 0.01,
        "fear": 0.02,
        "happy": 0.92,
        "sad": 0.01,
        "surprise": 0.02,
        "neutral": 0.01
      }
    }
  ],
  "processing_time_ms": 35
}
```

**Error Response** (HTTP 200 with error status)

```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "error",
  "error": {
    "code": "NO_FACE_DETECTED",
    "message": "No face detected in the image"
  }
}
```

---

### POST /internal/v1/inference/frame

Same as `/internal/v1/inference/image` but intended for video frames streamed from the realtime WebSocket pipeline. The request and response format are identical.

**Request**

- Content-Type: `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | Yes | Video frame as an image file (JPEG recommended for speed) |
| `request_id` | string (UUID) | Yes | Unique request identifier |
| `user_id` | string (UUID) | Yes | ID of the user who sent the frame |

**Example curl**

```bash
curl -X POST http://localhost:9000/internal/v1/inference/frame \
  -F "file=@/path/to/frame.jpg" \
  -F "request_id=550e8400-e29b-41d4-a716-446655440000" \
  -F "user_id=123e4567-e89b-12d3-a456-426614174000"
```

The response format is identical to `/internal/v1/inference/image`.

---

## Error Codes

| Code | Description |
|---|---|
| `NO_FACE_DETECTED` | The image or frame was processed successfully but no human face was found |
| `INVALID_IMAGE` | The uploaded file is not a valid image or is corrupted |
| `MODEL_INFERENCE_ERROR` | An unexpected error occurred during model inference |
| `MODEL_NOT_LOADED` | The model has not been loaded yet or failed to load at startup |

---

## Integration Steps

1. **Configure the backend** to point to this service by setting the environment variable in the backend `.env` file:

   ```env
   AI_SERVICE_BASE_URL=http://localhost:9000
   ```

   In production (Docker Compose), use the service name instead:

   ```env
   AI_SERVICE_BASE_URL=http://ai-service:9000
   ```

2. **Implement all four endpoints** listed above. The backend will call `/internal/v1/health` at startup to verify connectivity.

3. **Test each endpoint** using the curl examples provided in this README before connecting the backend.

4. **Verify response shapes** match the exact JSON structure shown. Field names and types are contractual.

---

## Security

This service is only accessible from the backend service within the internal Docker network (or localhost during development). It does **not** require any authentication between the backend and AI service. Do not expose port 9000 to the public internet.

---

## Technology

Any language or framework can be used to implement this service, as long as it conforms to the API contract. The recommended stack is:

- **Language:** Python 3.10+
- **Framework:** FastAPI
- **Model format:** ONNX or PyTorch
- **Image processing:** OpenCV or Pillow
- **Face detection:** OpenCV Haar Cascades, MTCNN, or RetinaFace

For the complete integration guide including a reference FastAPI implementation, model loading patterns, and Docker configuration, refer to:

```
docs/ai-service-integration-guide.md
```
