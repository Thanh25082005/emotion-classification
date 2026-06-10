# WebSocket Events Contract

## Overview

This document defines the WebSocket event contract for the real-time emotion classification feature. Clients connect to the backend WebSocket endpoint and stream video frames. The backend forwards each frame to the AI service and pushes results back to the client.

---

## Connection

**Endpoint**

```
ws://localhost:8000/api/v1/realtime/emotions?token=JWT_TOKEN
```

In production, replace `localhost:8000` with the deployed backend host and use `wss://` instead of `ws://`.

**Authentication**

The JWT access token is passed as a query parameter named `token`. The token is the same JWT issued by the `POST /api/v1/auth/login` endpoint.

```
?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

If the token is missing, invalid, or expired, the server closes the connection immediately with close code `4001`.

---

## Connection Lifecycle

1. Client opens WebSocket connection with a valid JWT token in the query string.
2. Server validates the token. On failure, closes with code `4001`.
3. On success, the connection is established. No initial handshake message is sent by the server.
4. Client sends `emotion.frame` events containing base64-encoded frames.
5. Server responds with `emotion.result` or `emotion.error` events for each frame.
6. Either side may send `ping` / `pong` to keep the connection alive.
7. Client or server closes the connection when the session ends.

---

## Message Format

All messages are JSON strings. Every message has a top-level `event` field that identifies the event type and a `data` field that carries the event payload.

```json
{
  "event": "<event-name>",
  "data": { ... }
}
```

---

## Client to Server Events

### emotion.frame

Sends a single video frame to the server for emotion classification.

**Recommended rate:** 1 frame per second. Sending frames faster may increase latency and server load. The server does not enforce a hard rate limit but may drop frames if overloaded.

**Message**

```json
{
  "event": "emotion.frame",
  "data": {
    "frame_base64": "<base64-encoded image bytes>",
    "timestamp": "2026-06-10T12:34:56.789Z"
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `frame_base64` | string | Yes | Base64-encoded JPEG or PNG image of the video frame |
| `timestamp` | string | Yes | ISO 8601 UTC timestamp of when the frame was captured on the client |

**Notes**
- Encode the frame as JPEG before base64 encoding for best performance.
- The `timestamp` field is stored with the result and used for ordering in the emotion history.

---

### ping

Sent by the client to keep the connection alive or verify the server is responsive.

**Message**

```json
{
  "event": "ping"
}
```

The `data` field may be omitted for `ping`.

---

## Server to Client Events

### emotion.result

Sent by the server after successfully classifying emotions in a received frame. One `emotion.result` event is sent for each `emotion.frame` that was processed successfully.

**Message**

```json
{
  "event": "emotion.result",
  "data": {
    "result_id": "7f3e4d2a-1b5c-4e8f-9a0d-3c6b2e1f4a7d",
    "faces": [
      {
        "emotion": "happy",
        "confidence": 0.92
      }
    ],
    "created_at": "2026-06-10T12:34:56.900Z"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `result_id` | string (UUID) | Unique identifier for this result record |
| `faces` | array | List of detected faces and their emotion classifications |
| `faces[].emotion` | string | Predicted emotion label for this face |
| `faces[].confidence` | float | Confidence score for the predicted emotion (0.0 to 1.0) |
| `created_at` | string | ISO 8601 UTC timestamp of when the server processed the frame |

If multiple faces are detected, the `faces` array contains one entry per face, in the same order as the AI service response.

---

### emotion.error

Sent by the server when a frame could not be processed. The client should handle this gracefully (e.g., display a warning, skip the frame).

**Message**

```json
{
  "event": "emotion.error",
  "data": {
    "code": "NO_FACE_DETECTED",
    "message": "No face detected in the frame"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `code` | string | Machine-readable error code (see error codes table) |
| `message` | string | Human-readable description of the error |

---

### pong

Sent by the server in response to a client `ping` event.

**Message**

```json
{
  "event": "pong"
}
```

---

## Error Codes

| Code | Description |
|---|---|
| `AI_SERVICE_UNAVAILABLE` | The AI service is unreachable or returned an unexpected error |
| `NO_FACE_DETECTED` | The frame was processed but no human face was detected |
| `MISSING_FRAME` | The `emotion.frame` message was received but `frame_base64` field is missing or empty |
| `INVALID_JSON` | The message received from the client was not valid JSON |
| `PROCESSING_ERROR` | An unexpected error occurred while processing the frame on the server |

---

## WebSocket Close Codes

| Code | Description |
|---|---|
| `1000` | Normal closure. Session ended gracefully by client or server. |
| `1011` | Internal server error. The server encountered an unexpected condition. |
| `4001` | Authentication failed. The JWT token was missing, invalid, or expired. |

---

## Rate Limit Note

The recommended client send rate is **1 frame per second**. This balances responsiveness with server and AI service load. Clients that send frames faster than this may experience:

- Increased processing latency
- `emotion.error` events with `PROCESSING_ERROR` if the server queue fills up

The server does not disconnect clients for exceeding the recommended rate, but it is the client's responsibility to self-throttle.

---

## Example Session

```
Client connects: ws://localhost:8000/api/v1/realtime/emotions?token=eyJ...

Client sends:
{
  "event": "emotion.frame",
  "data": {
    "frame_base64": "/9j/4AAQSkZJRgAB...",
    "timestamp": "2026-06-10T12:34:56.789Z"
  }
}

Server responds:
{
  "event": "emotion.result",
  "data": {
    "result_id": "7f3e4d2a-1b5c-4e8f-9a0d-3c6b2e1f4a7d",
    "faces": [
      { "emotion": "happy", "confidence": 0.92 }
    ],
    "created_at": "2026-06-10T12:34:56.900Z"
  }
}

Client sends:
{ "event": "ping" }

Server responds:
{ "event": "pong" }

Client closes connection (code 1000).
```
