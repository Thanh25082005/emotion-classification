# Backend REST API Contract

## Overview

This document defines the complete REST API contract for the emotion classification backend service. All client applications (web, mobile) consume this API.

---

## Base URL

```
http://localhost:8000/api/v1
```

In production, replace with the deployed backend host and use HTTPS.

---

## Authentication

Most endpoints require a valid JWT access token. Pass the token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Endpoints marked **Auth Required: No** are publicly accessible.

Access tokens expire after a short period (e.g., 15 minutes). Use the refresh token endpoint to obtain a new access token without re-logging in.

---

## Standard Error Response

All error responses follow this structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description of the error"
  }
}
```

All success responses include `"success": true` at the top level.

---

## Error Codes

| Code | HTTP Status | Description |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Request body or parameters failed validation |
| `UNAUTHORIZED` | 401 | Missing or invalid access token |
| `TOKEN_EXPIRED` | 401 | Access token has expired |
| `FORBIDDEN` | 403 | Authenticated user does not have permission |
| `NOT_FOUND` | 404 | Requested resource does not exist |
| `CONFLICT` | 409 | Resource already exists (e.g., duplicate email) |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `AI_SERVICE_UNAVAILABLE` | 503 | AI service is not reachable |
| `NO_FACE_DETECTED` | 200 | Image processed but no face found |
| `INVALID_IMAGE` | 422 | Uploaded file is not a valid image |
| `INVALID_CREDENTIALS` | 401 | Email or password is incorrect |
| `REFRESH_TOKEN_EXPIRED` | 401 | Refresh token has expired; user must log in again |
| `REFRESH_TOKEN_INVALID` | 401 | Refresh token is malformed or not found |

---

## Endpoints

---

### Auth

#### POST /auth/register

Register a new user account.

**Auth Required:** No

**Request Body** (application/json)

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "full_name": "Jane Doe"
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `email` | string | Yes | Valid email format, unique |
| `password` | string | Yes | Minimum 8 characters |
| `full_name` | string | Yes | 1–100 characters |

**Response** (HTTP 201)

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "user@example.com",
      "full_name": "Jane Doe",
      "created_at": "2026-06-10T12:00:00.000Z"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
  }
}
```

**Error Codes:** `VALIDATION_ERROR`, `CONFLICT`

---

#### POST /auth/login

Authenticate with email and password. Returns access and refresh tokens.

**Auth Required:** No

**Request Body** (application/json)

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response** (HTTP 200)

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "user@example.com",
      "full_name": "Jane Doe",
      "created_at": "2026-06-10T12:00:00.000Z"
    },
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
  }
}
```

**Error Codes:** `VALIDATION_ERROR`, `INVALID_CREDENTIALS`

---

#### POST /auth/refresh-token

Exchange a valid refresh token for a new access token.

**Auth Required:** No

**Request Body** (application/json)

```json
{
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

**Response** (HTTP 200)

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "bmV3UmVmcmVzaFRva2Vu..."
  }
}
```

**Error Codes:** `REFRESH_TOKEN_INVALID`, `REFRESH_TOKEN_EXPIRED`

---

#### GET /auth/me

Returns the profile of the currently authenticated user.

**Auth Required:** Yes

**Request:** No body or parameters.

**Response** (HTTP 200)

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "full_name": "Jane Doe",
    "created_at": "2026-06-10T12:00:00.000Z"
  }
}
```

**Error Codes:** `UNAUTHORIZED`, `TOKEN_EXPIRED`

---

#### POST /auth/logout

Invalidates the user's refresh token. The client should discard both tokens after calling this endpoint.

**Auth Required:** Yes

**Request Body** (application/json)

```json
{
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

**Response** (HTTP 200)

```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

**Error Codes:** `UNAUTHORIZED`, `TOKEN_EXPIRED`

---

### Users

#### GET /users/me

Returns the full profile of the currently authenticated user. Equivalent to `GET /auth/me` but under the users namespace.

**Auth Required:** Yes

**Request:** No body or parameters.

**Response** (HTTP 200)

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "full_name": "Jane Doe",
    "created_at": "2026-06-10T12:00:00.000Z",
    "updated_at": "2026-06-10T12:00:00.000Z"
  }
}
```

**Error Codes:** `UNAUTHORIZED`, `TOKEN_EXPIRED`

---

#### PATCH /users/me

Update the authenticated user's profile fields.

**Auth Required:** Yes

**Request Body** (application/json)

All fields are optional. Only provided fields are updated.

```json
{
  "full_name": "Jane Smith",
  "password": "newSecurePassword456"
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `full_name` | string | No | 1–100 characters |
| `password` | string | No | Minimum 8 characters |

**Response** (HTTP 200)

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "full_name": "Jane Smith",
    "updated_at": "2026-06-10T13:00:00.000Z"
  }
}
```

**Error Codes:** `UNAUTHORIZED`, `TOKEN_EXPIRED`, `VALIDATION_ERROR`

---

### Emotions

#### POST /emotions/predict

Upload an image and receive emotion classification results. The backend forwards the image to the AI service.

**Auth Required:** Yes

**Request** (multipart/form-data)

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | Yes | Image file (JPEG, PNG). Max 10MB. |

**Response** (HTTP 200)

```json
{
  "success": true,
  "data": {
    "emotion_record_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "faces": [
      {
        "face_id": "face-1",
        "box": { "x": 120, "y": 80, "width": 160, "height": 160 },
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
    "processing_time_ms": 35,
    "created_at": "2026-06-10T12:34:56.000Z"
  }
}
```

**Error Codes:** `UNAUTHORIZED`, `TOKEN_EXPIRED`, `INVALID_IMAGE`, `NO_FACE_DETECTED`, `AI_SERVICE_UNAVAILABLE`, `INTERNAL_ERROR`

---

#### GET /emotions/history

Returns a paginated list of past emotion classification records for the authenticated user.

**Auth Required:** Yes

**Query Parameters**

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | integer | No | 1 | Page number (1-indexed) |
| `limit` | integer | No | 20 | Records per page (max 100) |
| `start_date` | string | No | - | ISO 8601 date to filter results from |
| `end_date` | string | No | - | ISO 8601 date to filter results to |

**Response** (HTTP 200)

```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "emotion": "happy",
        "confidence": 0.92,
        "faces_detected": 1,
        "created_at": "2026-06-10T12:34:56.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "total_pages": 3
    }
  }
}
```

**Error Codes:** `UNAUTHORIZED`, `TOKEN_EXPIRED`, `VALIDATION_ERROR`

---

#### GET /emotions/statistics

Returns aggregated emotion statistics for the authenticated user.

**Auth Required:** Yes

**Query Parameters**

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `start_date` | string | No | 30 days ago | ISO 8601 date |
| `end_date` | string | No | now | ISO 8601 date |

**Response** (HTTP 200)

```json
{
  "success": true,
  "data": {
    "total_records": 45,
    "date_range": {
      "start": "2026-05-11T00:00:00.000Z",
      "end": "2026-06-10T23:59:59.000Z"
    },
    "emotion_distribution": {
      "happy": 20,
      "neutral": 12,
      "sad": 5,
      "angry": 3,
      "surprise": 3,
      "fear": 1,
      "disgust": 1
    },
    "dominant_emotion": "happy"
  }
}
```

**Error Codes:** `UNAUTHORIZED`, `TOKEN_EXPIRED`, `VALIDATION_ERROR`

---

#### GET /emotions/:id

Returns the full details of a single emotion classification record by ID.

**Auth Required:** Yes

**Path Parameters**

| Parameter | Type | Description |
|---|---|---|
| `id` | string (UUID) | ID of the emotion record |

**Response** (HTTP 200)

```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "faces": [
      {
        "face_id": "face-1",
        "box": { "x": 120, "y": 80, "width": 160, "height": 160 },
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
    "processing_time_ms": 35,
    "created_at": "2026-06-10T12:34:56.000Z"
  }
}
```

**Error Codes:** `UNAUTHORIZED`, `TOKEN_EXPIRED`, `NOT_FOUND`, `FORBIDDEN`

---

#### DELETE /emotions/:id

Deletes a single emotion classification record. The user can only delete their own records.

**Auth Required:** Yes

**Path Parameters**

| Parameter | Type | Description |
|---|---|---|
| `id` | string (UUID) | ID of the emotion record to delete |

**Response** (HTTP 200)

```json
{
  "success": true,
  "data": {
    "message": "Record deleted successfully"
  }
}
```

**Error Codes:** `UNAUTHORIZED`, `TOKEN_EXPIRED`, `NOT_FOUND`, `FORBIDDEN`

---

### Realtime

#### WebSocket /realtime/emotions

Establishes a WebSocket connection for real-time frame-by-frame emotion classification.

**Auth Required:** Yes (JWT token as query parameter)

**Connection URL**

```
ws://localhost:8000/api/v1/realtime/emotions?token=<access_token>
```

Refer to `websocket-events.md` for the full event contract, message formats, error codes, and rate limit guidance.

**Close Codes**

| Code | Description |
|---|---|
| `4001` | Authentication failed |

---

### Health

#### GET /health

Public health check endpoint. Returns the health status of the backend service and its dependencies.

**Auth Required:** No

**Response** (HTTP 200)

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "backend",
    "version": "1.0.0",
    "dependencies": {
      "database": "ok",
      "ai_service": "ok"
    }
  }
}
```

If a dependency is unavailable, its value will be `"unavailable"`. The HTTP status remains 200 so that load balancers do not remove the backend pod from rotation when the AI service is degraded.
