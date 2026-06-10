# System Architecture

## Overview

The Emotion Classification System is a distributed application composed of four primary components: a Next.js frontend, a FastAPI backend, a planned AI Service microservice, and a PostgreSQL database.

## Component Diagram

```
                        +---------------------------+
                        |   Frontend (Next.js)      |
                        |   localhost:3000          |
                        +------------+--------------+
                                     |
                          HTTP/WebSocket (REST + WS)
                                     |
                        +------------+--------------+
                        |   Backend (FastAPI)       |
                        |   localhost:8000          |
                        +------+----------+---------+
                               |          |
                    HTTP (internal)      SQL (asyncpg)
                               |          |
               +---------------+     +----+-------------+
               | AI Service        | | PostgreSQL        |
               | localhost:9000    | | localhost:5432    |
               | (planned)         | |                   |
               +-------------------+ +-------------------+
```

## Component Descriptions

### Frontend (Next.js :3000)

The client-side application built with Next.js (TypeScript). Responsible for:

- Rendering all UI pages (home, login, register, dashboard, realtime detection, history).
- Capturing video frames from the user's camera via the browser MediaDevices API.
- Authenticating with the backend using JWT tokens stored in-memory and in cookies.
- Maintaining a persistent WebSocket connection for realtime emotion result streaming.
- Managing global auth state with Zustand.
- Communicating with the backend REST API through an Axios instance that automatically attaches Bearer tokens and handles token refresh on 401 responses.

### Backend (FastAPI :8000)

The central API server built with FastAPI (Python 3.11, async). Responsible for:

- Exposing REST endpoints for authentication, user management, emotion history, and image-based inference.
- Managing WebSocket connections for realtime frame processing.
- Forwarding frames and images to the AI Service and handling AI Service unavailability gracefully (returns 503).
- Persisting emotion results, realtime sessions, and user data to PostgreSQL.
- Issuing and validating JWT access and refresh tokens.
- Broadcasting processed emotion results back to connected WebSocket clients.

### AI Service (:9000, planned)

A separate Python microservice dedicated entirely to machine learning inference. Responsible for:

- Detecting faces in image/frame payloads.
- Running the emotion classification model and returning per-face probability scores.
- Exposing a minimal internal HTTP API consumed only by the Backend.
- Being horizontally scalable independently of the backend.

This service is not yet implemented. See `/home/thanh/emotion-classification/docs/ai-service-integration-guide.md` for the full implementation contract.

### Database (PostgreSQL :5432)

PostgreSQL 15 is the system's primary data store. Responsible for:

- Persisting user accounts, hashed passwords, and profile metadata.
- Storing emotion inference results with a JSONB column for flexible per-face data.
- Tracking realtime WebSocket sessions and their lifecycle state.
- Storing hashed refresh tokens for token rotation.

## Request Flow

### Realtime Emotion Detection (WebSocket path)

1. User opens the `/realtime` page and grants camera permission.
2. Frontend establishes a WebSocket connection to the Backend, passing the JWT access token as a query parameter.
3. Backend authenticates the token on connection and creates a realtime session record in the database.
4. Frontend begins capturing video frames at ~1 fps and encodes each frame as a base64 JPEG string.
5. Frontend sends an `emotion.frame` WebSocket event containing the encoded frame.
6. Backend decodes the frame and forwards it as a multipart HTTP POST to the AI Service (`POST /internal/v1/inference/frame`).
7. AI Service runs face detection and emotion classification, returning a list of face results with emotion scores.
8. Backend persists the result to the `emotion_results` table (with `source = realtime`).
9. Backend broadcasts an `emotion.result` WebSocket event to the client with the full result payload.
10. Frontend receives the result and updates the UI overlay (bounding boxes, emotion labels, confidence bars).

### Image Upload (REST path)

1. User uploads an image through the dashboard.
2. Frontend sends a `multipart/form-data` POST to `POST /api/v1/emotions/predict`.
3. Backend forwards the file to the AI Service (`POST /internal/v1/inference/image`).
4. AI Service returns face results.
5. Backend saves the result to the `emotion_results` table (with `source = upload`).
6. Backend returns the full result JSON to the frontend.

## Module Structure

### Backend (`apps/backend/src/`)

```
src/
├── main.py                  # FastAPI application factory, lifespan, middleware
├── core/
│   ├── config.py            # Settings loaded from environment variables (Pydantic BaseSettings)
│   ├── security.py          # JWT creation/validation, bcrypt helpers
│   └── dependencies.py      # FastAPI Depends: get_db, get_current_user, etc.
├── api/
│   └── v1/
│       ├── router.py        # Aggregates all v1 sub-routers
│       ├── routes/
│       │   ├── auth.py      # /auth/register, /auth/login, /auth/refresh, /auth/logout
│       │   ├── users.py     # /users/me (GET, PATCH)
│       │   ├── emotions.py  # /emotions/predict, /emotions/history, /emotions/{id}
│       │   └── realtime.py  # /realtime/ws (WebSocket), /realtime/sessions
│       └── schemas/
│           ├── auth.py      # Request/response Pydantic models for auth
│           ├── users.py     # User schemas
│           └── emotions.py  # EmotionResult, FaceResult, etc.
├── modules/
│   ├── auth/
│   │   ├── service.py       # register, login, refresh, logout business logic
│   │   └── repository.py    # DB queries for users and refresh_tokens
│   ├── users/
│   │   ├── service.py
│   │   └── repository.py
│   ├── emotions/
│   │   ├── service.py       # Orchestrates AI Service calls and DB persistence
│   │   └── repository.py
│   └── realtime/
│       ├── manager.py       # WebSocket connection manager (in-memory)
│       └── service.py       # Frame processing pipeline
├── db/
│   ├── base.py              # SQLAlchemy async engine and session factory
│   ├── models/              # ORM models: User, EmotionResult, RealtimeSession, RefreshToken
│   └── migrations/          # Alembic env.py and version scripts
└── clients/
    └── ai_service.py        # Async HTTP client (httpx) for the AI Service
```

### Frontend (`apps/frontend/src/`)

```
src/
├── app/                     # Next.js App Router pages
│   ├── page.tsx             # / landing page
│   ├── login/page.tsx       # /login
│   ├── register/page.tsx    # /register
│   ├── dashboard/page.tsx   # /dashboard
│   ├── realtime/page.tsx    # /realtime (camera + WebSocket)
│   └── history/page.tsx     # /history
├── components/              # Reusable UI components
│   ├── EmotionOverlay/      # Canvas overlay for bounding boxes and labels
│   ├── CameraCapture/       # MediaDevices wrapper
│   ├── EmotionChart/        # Bar/pie chart for emotion probabilities
│   └── ui/                  # Generic UI primitives (Button, Input, Card, etc.)
├── services/
│   ├── api.ts               # Axios instance with auth interceptors
│   ├── authService.ts       # Login, register, refresh calls
│   ├── emotionService.ts    # Predict and history API calls
│   └── websocketService.ts  # WebSocket lifecycle and event management
├── stores/
│   └── authStore.ts         # Zustand store: user, tokens, login/logout actions
├── types/
│   ├── auth.ts              # LoginRequest, RegisterRequest, TokenResponse, User
│   └── emotion.ts           # EmotionResult, FaceResult, EmotionScores
└── lib/
    └── utils.ts             # Utility helpers (cn, formatDate, etc.)
```

## Security

| Concern              | Implementation                                                                 |
|----------------------|--------------------------------------------------------------------------------|
| Authentication       | JWT access tokens (15 min expiry) + refresh tokens (7 day expiry)             |
| Password storage     | bcrypt with cost factor 12                                                     |
| Refresh token safety | Hashed with SHA-256 before database storage; rotated on each use              |
| CORS                 | Configured per environment; restricts allowed origins in production           |
| Internal endpoints   | AI Service exposes `/internal/` prefixed routes — not routed from the frontend |
| Input validation     | Pydantic models validate all incoming request bodies                          |

## Design Decisions

### AI Service Separated for Scalability

The ML inference workload is computationally expensive and has different scaling characteristics than the API layer. Separating it into a dedicated microservice allows independent horizontal scaling (e.g., GPU-backed instances), model hot-swapping without backend downtime, and language/framework freedom for the ML team.

### WebSocket for Realtime

Polling-based approaches introduce latency and unnecessary load. A persistent WebSocket connection allows the backend to push results immediately after inference completes, enabling sub-second UI updates for the realtime camera view.

### JSONB for Face Results Storage

Emotion results contain a variable-length array of per-face objects (bounding box, emotion scores, dominant emotion). Using a PostgreSQL JSONB column avoids a complex normalized schema while still allowing JSON path queries and GIN indexing when needed. The top-level columns (dominant emotion, face count, processing time) are stored as typed columns for efficient filtering and aggregation.
