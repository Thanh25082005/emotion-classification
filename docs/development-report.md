# Development Report - Emotion Classification System Foundation

**Date:** 2026-06-10

---

## What Was Built

This report summarizes the foundation layer of the Emotion Classification System — everything that has been implemented and is ready for the AI Service to be plugged in.

---

### Backend (FastAPI Python)

**Location:** `apps/backend/`

**Architecture pattern:** Route -> Service -> Repository -> Database

Each feature module follows the same layered structure: the route handler parses and validates the HTTP request, delegates business logic to the service layer, which calls the repository layer for all database operations. This keeps concerns separated and makes each layer independently testable.

**API Endpoints Implemented:**

| Method   | Path                                   | Description                                      |
|----------|----------------------------------------|--------------------------------------------------|
| GET      | `/api/v1/health`                       | Health check, returns service status and version |
| POST     | `/api/v1/auth/register`                | Register a new user account                      |
| POST     | `/api/v1/auth/login`                   | Login with email/password, returns token pair    |
| POST     | `/api/v1/auth/refresh`                 | Refresh access token using refresh token         |
| POST     | `/api/v1/auth/logout`                  | Revoke refresh token                             |
| GET      | `/api/v1/users/me`                     | Get current authenticated user profile           |
| PATCH    | `/api/v1/users/me`                     | Update current user profile                      |
| POST     | `/api/v1/emotions/predict`             | Upload image and run emotion inference           |
| GET      | `/api/v1/emotions/history`             | List paginated emotion results for current user  |
| GET      | `/api/v1/emotions/{id}`                | Get a single emotion result by ID                |
| DELETE   | `/api/v1/emotions/{id}`                | Delete an emotion result                         |
| WS       | `/api/v1/realtime/ws`                  | WebSocket endpoint for realtime frame streaming  |
| GET      | `/api/v1/realtime/sessions`            | List realtime sessions for current user          |
| GET      | `/api/v1/realtime/sessions/{id}`       | Get a single realtime session with stats         |

**Key Features:**

- **JWT authentication:** Access tokens (15 min) and refresh tokens (7 days). Refresh tokens are hashed (SHA-256) before storage and rotated on every use.
- **bcrypt password hashing:** Cost factor 12 applied to all user passwords.
- **WebSocket realtime pipeline:** Connection manager handles multiple concurrent clients, authenticates on connect, creates session records, and broadcasts results.
- **AI Service HTTP client:** Async `httpx` client with configurable timeout and base URL. All AI Service errors (connection refused, timeout, 5xx) are caught and re-raised as clean `503` responses to callers. The rest of the system remains fully functional when the AI Service is down.
- **Alembic migrations:** Full schema managed via versioned migration scripts. `alembic upgrade head` brings any fresh database to the correct state.

---

### Frontend (Next.js TypeScript)

**Location:** `apps/frontend/`

**Pages implemented:**

| Route        | Description                                                                  |
|--------------|------------------------------------------------------------------------------|
| `/`          | Landing page with product overview and links to login/register               |
| `/login`     | Email/password login form; redirects to dashboard on success                 |
| `/register`  | Registration form with validation; redirects to login on success             |
| `/dashboard` | Authenticated home page; image upload widget and summary stats               |
| `/realtime`  | Live camera view with WebSocket connection, emotion overlay on video stream  |
| `/history`   | Paginated table/grid of past emotion results with detail modal               |

**Key Features:**

- **Zustand auth store:** Global authentication state (user object, access token, refresh token). Persisted to localStorage for session continuity across page reloads.
- **Axios with interceptors:** Automatic `Authorization: Bearer <token>` injection on every request. On `401` responses, the interceptor silently refreshes the token and retries the original request once before redirecting to login.
- **WebSocket service:** Class-based service managing connection lifecycle (connect, disconnect, reconnect with exponential backoff), event subscription, and frame sending.
- **Camera capture component:** Uses `navigator.mediaDevices.getUserMedia` to access the webcam. Draws frames to a hidden canvas element for base64 encoding before sending via WebSocket.
- **Route protection:** Middleware redirects unauthenticated users to `/login` for all protected routes.

---

### Database

**Location:** `apps/backend/src/db/`

**Tables:**

| Table               | Purpose                                                              |
|---------------------|----------------------------------------------------------------------|
| `users`             | User accounts: email, hashed password, profile data, active flag    |
| `emotion_results`   | Inference results: per-face JSONB data, dominant emotion, source     |
| `realtime_sessions` | WebSocket session lifecycle tracking: status, frame count, duration  |
| `refresh_tokens`    | Hashed refresh tokens with expiry and revocation flag               |

Alembic migrations are included and manage the full schema from scratch. Running `alembic upgrade head` on a blank database creates all tables, indexes, and the `uuid-ossp` extension.

Full schema documentation: `/home/thanh/emotion-classification/docs/database-schema.md`

---

### AI Service Status

**NOT IMPLEMENTED.**

The AI Service directory exists at `services/ai-service/` with only a `README.md` and a `.gitkeep` placeholder. No inference logic, no model loading, no HTTP endpoints.

The backend is fully wired to call the AI Service and handles its absence gracefully:

- Image upload (`POST /api/v1/emotions/predict`): returns `503 Service Unavailable` with a clear error message when the AI Service is unreachable.
- Realtime WebSocket: sends a `session.error` event with code `AI_SERVICE_UNAVAILABLE` and keeps the connection open.

---

## AI Service Contract

The developer implementing the AI Service must implement 4 endpoints. The full guide is at:

```
docs/ai-service-integration-guide.md
```

The machine-readable API contract is at:

```
packages/shared/api-contracts/ai-service-contract.md
```

**Summary of required endpoints:**

| Method | Path                                 |
|--------|--------------------------------------|
| GET    | `/internal/v1/health`                |
| GET    | `/internal/v1/model/info`            |
| POST   | `/internal/v1/inference/image`       |
| POST   | `/internal/v1/inference/frame`       |

---

## Environment Variables

All required environment variables for running the system:

| Variable                     | Where used       | Example value                                                        | Description                              |
|------------------------------|------------------|----------------------------------------------------------------------|------------------------------------------|
| `DATABASE_URL`               | Backend          | `postgresql+asyncpg://postgres:password@db:5432/emotion_db`          | Async database connection string         |
| `JWT_SECRET`                 | Backend          | `super-secret-random-string-at-least-32-chars`                       | JWT signing secret                       |
| `JWT_ALGORITHM`              | Backend          | `HS256`                                                              | JWT signing algorithm                    |
| `ACCESS_TOKEN_EXPIRE_MINUTES`| Backend          | `15`                                                                 | Access token lifetime in minutes         |
| `REFRESH_TOKEN_EXPIRE_DAYS`  | Backend          | `7`                                                                  | Refresh token lifetime in days           |
| `AI_SERVICE_BASE_URL`        | Backend          | `http://localhost:9000`                                              | URL of the AI Service                    |
| `CORS_ORIGINS`               | Backend          | `http://localhost:3000`                                              | Allowed frontend origins                 |
| `ENVIRONMENT`                | Backend          | `development`                                                        | `development` or `production`            |
| `POSTGRES_USER`              | Docker Compose   | `postgres`                                                           | PostgreSQL user (Compose only)           |
| `POSTGRES_PASSWORD`          | Docker Compose   | `password`                                                           | PostgreSQL password (Compose only)       |
| `POSTGRES_DB`                | Docker Compose   | `emotion_db`                                                         | PostgreSQL database name (Compose only)  |
| `NEXT_PUBLIC_API_URL`        | Frontend         | `http://localhost:8000`                                              | Backend REST API base URL                |
| `NEXT_PUBLIC_WS_URL`         | Frontend         | `ws://localhost:8000`                                                | Backend WebSocket base URL               |

---

## How to Run

### Docker Compose (recommended)

```bash
cp .env.example .env
docker-compose up -d
```

Frontend: http://localhost:3000
Backend API docs: http://localhost:8000/docs

### Local Development

See the full setup guide at `docs/setup.md`.

Quick reference:

```bash
# Backend
cd apps/backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env  # edit DATABASE_URL and JWT_SECRET
alembic upgrade head
uvicorn src.main:app --reload --port 8000

# Frontend (separate terminal)
cd apps/frontend
npm install
cp .env.example .env.local
npm run dev
```

---

## How to Test the API

### Register a user

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dev@example.com",
    "password": "TestPass123",
    "full_name": "Dev User"
  }'
```

### Login and capture the access token

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "dev@example.com", "password": "TestPass123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

echo "Access token: $TOKEN"
```

### Test emotion prediction (AI Service unavailable — expected 503)

```bash
curl -X POST http://localhost:8000/api/v1/emotions/predict \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/photo.jpg"

# Expected response:
# HTTP 503
# {"detail": "Emotion analysis service is currently unavailable."}
```

This 503 is the correct behavior until the AI Service is implemented.

### Get current user profile

```bash
curl http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## TODO / Next Steps

1. **Implement AI Service** in `services/ai-service/` following the guide at `docs/ai-service-integration-guide.md`. This is the highest priority item to complete the system.
2. **Update `AI_SERVICE_BASE_URL`** in the backend `.env` (or `docker-compose.yml`) to point to the running AI Service instance.
3. **Test full end-to-end flow**: upload an image, verify emotion results are returned and persisted, open the realtime page and confirm live detection works.
4. **Add Redis-based rate limiting** on the WebSocket frame handler to enforce the 1 fps recommendation server-side and protect against abuse.
5. **Add email verification**: the `is_verified` column already exists on the `users` table. Wire up a transactional email provider (SendGrid, Resend, etc.) and implement the verification flow.
6. **Deploy to production**: containerize all services (AI Service Dockerfile is pending), set up a managed PostgreSQL instance, configure production CORS origins, and ensure `JWT_SECRET` is a cryptographically strong random value.
