# AI Service Internal API Contract v1.0

## Overview

This document defines the internal HTTP API contract between the backend service and the AI service (emotion classifier). The backend is the sole consumer of this API. All endpoints are internal and must not be exposed to the public internet.

The AI service performs:
- Face detection in images and video frames
- Per-face emotion classification
- Returning structured results with bounding boxes, labels, and confidence scores

Any implementation of the AI service must conform to this contract exactly. Field names, types, and HTTP status codes are binding.

---

## Base URL

```
http://localhost:9000
```

In Docker Compose environments, replace `localhost` with the AI service container name (e.g., `http://ai-service:9000`).

All paths are prefixed with `/internal/v1`.

---

## Endpoints

### 1. Health Check

**GET** `/internal/v1/health`

Used by the backend to verify the AI service is reachable and running correctly. Called at backend startup and periodically by health monitors.

**Authentication:** None

**Request:** No body or parameters required.

**Response** (HTTP 200)

```json
{
  "status": "ok",
  "service": "ai-service",
  "version": "1.0.0"
}
```

| Field | Type | Description |
|---|---|---|
| `status` | string | Always `"ok"` when the service is healthy |
| `service` | string | Service identifier, always `"ai-service"` |
| `version` | string | Current version of the AI service |

---

### 2. Model Info

**GET** `/internal/v1/model/info`

Returns metadata about the loaded machine learning model.

**Authentication:** None

**Request:** No body or parameters required.

**Response** (HTTP 200)

```json
{
  "model_name": "emotion-classifier",
  "model_version": "1.0.0",
  "labels": ["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"],
  "input_type": ["image", "frame"],
  "supports_multiple_faces": true
}
```

| Field | Type | Description |
|---|---|---|
| `model_name` | string | Name identifier of the model |
| `model_version` | string | Version string of the model weights |
| `labels` | string[] | All possible emotion labels the model can output, in fixed order |
| `input_type` | string[] | Accepted input modes: `"image"` for static images, `"frame"` for video frames |
| `supports_multiple_faces` | boolean | Whether the model handles multiple faces per input |

The `labels` array order must remain stable across versions. The order here (`angry`, `disgust`, `fear`, `happy`, `sad`, `surprise`, `neutral`) is the canonical order used in `scores` objects throughout the API.

---

### 3. Image Inference

**POST** `/internal/v1/inference/image`

Accepts a static image and returns emotion classification results for all detected faces.

**Authentication:** None

**Request**

- Content-Type: `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | Yes | Image file. Supported formats: JPEG, PNG, BMP, WEBP. Max size: 10MB. |
| `request_id` | string | Yes | UUID v4 string. Used for tracing and idempotency. |
| `user_id` | string | Yes | UUID v4 string. ID of the user who submitted the request. |

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

**Error Response** (HTTP 200)

The AI service always returns HTTP 200 and communicates errors via the `status` field.

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

### 4. Frame Inference

**POST** `/internal/v1/inference/frame`

Identical contract to `/internal/v1/inference/image`. This endpoint is used for video frames delivered from the realtime WebSocket pipeline. Implementations may optimize this endpoint for lower latency (e.g., skip resizing, use JPEG decoding).

**Authentication:** None

**Request**

- Content-Type: `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | Yes | Video frame encoded as JPEG (recommended) or PNG. |
| `request_id` | string | Yes | UUID v4 string. |
| `user_id` | string | Yes | UUID v4 string. |

**Response:** Identical structure to `/internal/v1/inference/image`.

---

## Response Field Reference

### Face Object

| Field | Type | Description |
|---|---|---|
| `face_id` | string | Sequential identifier for each face in the image. Format: `"face-1"`, `"face-2"`, etc. Starts at 1. |
| `box` | object | Bounding box of the detected face in pixel coordinates |
| `box.x` | integer | X coordinate of the top-left corner |
| `box.y` | integer | Y coordinate of the top-left corner |
| `box.width` | integer | Width of the bounding box in pixels |
| `box.height` | integer | Height of the bounding box in pixels |
| `emotion` | string | The predicted emotion label with the highest confidence score |
| `confidence` | float | Confidence of the top emotion prediction. Range: 0.0 to 1.0 (inclusive). |
| `scores` | object | Probability score for each emotion label. All values are floats in range 0.0 to 1.0. |

### Scores Object

The `scores` object contains one key for every label in the model's `labels` array. All score values sum to approximately 1.0 (within floating point precision).

```json
{
  "angry": 0.01,
  "disgust": 0.01,
  "fear": 0.02,
  "happy": 0.92,
  "sad": 0.01,
  "surprise": 0.02,
  "neutral": 0.01
}
```

### processing_time_ms

The `processing_time_ms` field (integer) reports the total time in milliseconds taken by the AI service to process the request, including face detection and emotion inference. It does not include network transit time.

---

## Error Codes

| Code | HTTP Status | Description |
|---|---|---|
| `NO_FACE_DETECTED` | 200 | Image was valid but no human face was found |
| `INVALID_IMAGE` | 200 | The uploaded file is not a valid or decodable image |
| `MODEL_INFERENCE_ERROR` | 200 | An error occurred during model inference (e.g., memory error, unexpected input shape) |
| `MODEL_NOT_LOADED` | 200 | The model is not loaded. The service may still be initializing. |

All errors are returned as HTTP 200 with `"status": "error"` and an `error` object containing `code` and `message`. The backend must check the `status` field, not only the HTTP status code.

---

## Versioning

- This document covers API version `v1`.
- The version prefix `/internal/v1/` is part of every path.
- Breaking changes (field removals, type changes, endpoint removals) require a new version prefix (`/internal/v2/`).
- Additive changes (new optional response fields, new error codes) are allowed within `v1` without a version bump.
- The AI service must report its version in the `/internal/v1/health` response.
