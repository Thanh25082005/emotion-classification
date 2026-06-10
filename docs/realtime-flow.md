# Realtime Emotion Detection Flow

## Overview

The realtime detection feature uses a persistent WebSocket connection to stream video frames from the browser to the backend, receive emotion results, and update the UI in near-real-time. The recommended capture rate is **1 frame per second (1 fps)** to balance responsiveness with server load.

---

## Connection Setup

The client connects to the WebSocket endpoint by passing the JWT access token as a query parameter:

```
ws://localhost:8000/api/v1/realtime/ws?token=<jwt_access_token>
```

Using a query parameter (rather than a header) is necessary because the browser WebSocket API does not support custom headers. The token is validated on the server immediately after the connection is established.

---

## Authentication Flow on WebSocket Connect

```
Client                                  Backend
  |                                        |
  |--- WS Upgrade (token=<jwt>) ---------->|
  |                                        |-- Validate JWT
  |                                        |-- If invalid: close(4001, "Unauthorized")
  |                                        |-- If valid:   load user from DB
  |                                        |-- Create realtime_sessions row (status=active)
  |<--- WS Connection Accepted ------------|
  |                                        |
  |<--- {"event": "session.started",       |
  |      "session_id": "<uuid>"} ----------|
```

If the token is expired or invalid, the server closes the connection with code `4001` before any frames are processed.

---

## Frame Processing Flow

### Step-by-step

```
Client                          Backend                        AI Service          Database
  |                                |                               |                   |
  |-- capture frame (canvas) ----> |                               |                   |
  |-- base64 encode (JPEG) ------> |                               |                   |
  |                                |                               |                   |
  |-- WS send: {                   |                               |                   |
  |     "event": "emotion.frame",  |                               |                   |
  |     "data": {                  |                               |                   |
  |       "frame": "<base64>",     |                               |                   |
  |       "timestamp": 1234567890  |                               |                   |
  |     }                          |                               |                   |
  |   } --------------------------->|                               |                   |
  |                                |                               |                   |
  |                                |-- POST /internal/v1/          |                   |
  |                                |   inference/frame ----------->|                   |
  |                                |   (multipart: frame bytes,    |                   |
  |                                |    request_id, user_id)       |                   |
  |                                |                               |-- detect faces     |
  |                                |                               |-- run model        |
  |                                |<-- 200 OK {face_results} -----|                   |
  |                                |                               |                   |
  |                                |-- INSERT emotion_results ----->|                   |
  |                                |   (source=realtime)           |                   |
  |                                |                               |                   |
  |<-- WS send: {                  |                               |                   |
  |     "event": "emotion.result", |                               |                   |
  |     "data": {                  |                               |                   |
  |       "result_id": "<uuid>",   |                               |                   |
  |       "face_count": 1,         |                               |                   |
  |       "dominant_emotion": "happy",                             |                   |
  |       "faces": [...],          |                               |                   |
  |       "processing_time_ms": 45 |                               |                   |
  |     }                          |                               |                   |
  |   } <--------------------------|                               |                   |
  |                                |                               |                   |
  |-- update UI overlay ---------->|                               |                   |
```

### WebSocket Event Reference

| Event name        | Direction        | Payload fields                                                                 |
|-------------------|------------------|--------------------------------------------------------------------------------|
| `session.started` | Server -> Client | `session_id`                                                                   |
| `emotion.frame`   | Client -> Server | `frame` (base64 string), `timestamp` (unix ms)                                |
| `emotion.result`  | Server -> Client | `result_id`, `face_count`, `dominant_emotion`, `faces[]`, `processing_time_ms` |
| `session.error`   | Server -> Client | `code`, `message`                                                              |
| `session.ended`   | Server -> Client | `session_id`, `frame_count`, `duration_ms`                                    |

---

## Session Teardown

When the client disconnects (tab closed, page navigated away, or explicit close):

1. Backend WebSocket handler catches the disconnect event.
2. Backend updates the `realtime_sessions` row: `status = 'closed'`, `ended_at = NOW()`, final `frame_count`.
3. The backend sends a `session.ended` event just before the connection closes (best-effort).

---

## Error Handling

### AI Service Unavailable

If the backend cannot reach the AI Service (connection refused, timeout, 5xx response):

- The frame result is NOT saved to the database.
- The backend sends a `session.error` event to the client:
  ```json
  {
    "event": "session.error",
    "data": {
      "code": "AI_SERVICE_UNAVAILABLE",
      "message": "Emotion analysis is temporarily unavailable. Please try again later."
    }
  }
```
- The WebSocket connection remains open; the client can continue sending frames.
- The backend logs the error for monitoring.

### No Face Detected

If the AI Service processes the frame successfully but detects zero faces:

- A result IS saved to the database with `face_count = 0` and `faces = []`.
- The backend sends an `emotion.result` event with `face_count: 0` and an empty `faces` array.
- The frontend should display a "No face detected" message in the overlay rather than crashing.

### Invalid Frame

If the client sends a frame that cannot be decoded (corrupted base64, unsupported format):

- The backend sends a `session.error` event with code `INVALID_FRAME`.
- The frame is discarded; the session continues.

### JWT Token Expired During Session

WebSocket connections persist beyond the access token lifetime (15 minutes). If the backend detects an expired token mid-session (e.g., during a revalidation check), it:

1. Sends a `session.error` event with code `TOKEN_EXPIRED`.
2. Closes the connection with WebSocket code `4001`.
3. The client should respond by silently refreshing the token and reconnecting.

---

## Reconnection Strategy

The frontend WebSocket service implements automatic reconnection with exponential backoff:

| Attempt | Delay before retry |
|---------|--------------------|
| 1st     | 1 second           |
| 2nd     | 2 seconds          |
| 3rd     | 4 seconds          |
| 4th     | 8 seconds          |
| 5th+    | 16 seconds (cap)   |

Before reconnecting, the service checks whether the access token is still valid and refreshes it if needed. The session ID from the previous connection is not reused — a new session is created on each successful reconnect.

Reconnection is NOT attempted if the close code is `4001` (authentication failure) without first refreshing the token.

---

## Rate Limiting Recommendation

To prevent overloading the AI Service and the backend, clients should send **no more than 1 frame per second**. This rate provides a responsive user experience while keeping per-user inference cost manageable.

Implementation guidance for the frontend:

```typescript
// Capture and send one frame every 1000ms
const FRAME_INTERVAL_MS = 1000;

useEffect(() => {
  const interval = setInterval(() => {
    if (wsService.isConnected()) {
      const frame = captureFrame(); // base64 JPEG from canvas
      wsService.sendFrame(frame);
    }
  }, FRAME_INTERVAL_MS);

  return () => clearInterval(interval);
}, []);
```

If the backend wishes to enforce this server-side, a per-user rate limiter (e.g., Redis token bucket) can be added to the WebSocket frame handler. Frames that exceed the rate limit should be silently dropped (not closing the connection).
