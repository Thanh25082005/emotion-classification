# Setup Guide

This guide covers two ways to run the Emotion Classification System: using Docker Compose (recommended for a quick start) and running each service locally for active development.

## Prerequisites

| Tool             | Minimum Version | Notes                                      |
|------------------|-----------------|--------------------------------------------|
| Docker           | 24+             | Required for Option 1                      |
| Docker Compose   | 2.20+           | Bundled with Docker Desktop                |
| Node.js          | 18+             | Required for Option 2 (frontend)           |
| Python           | 3.11+           | Required for Option 2 (backend)            |
| PostgreSQL       | 15+             | Required for Option 2 (database)           |
| Git              | any             | To clone the repository                    |

---

## Option 1: Docker Compose (Recommended)

This is the fastest way to get the full stack running. All services — backend, frontend, and database — are started together.

### Steps

```bash
# 1. Clone the repository
git clone <repository-url>
cd emotion-classification

# 2. Copy the example environment file
cp .env.example .env

# 3. (Optional) Edit .env if you need custom values
#    The defaults work out of the box with Docker Compose.

# 4. Start all services in detached mode
docker-compose up -d

# 5. Check that all containers are running
docker-compose ps
```

Once all containers show status `running`, open your browser at:

```
http://localhost:3000
```

The backend API is available at `http://localhost:8000/docs` (Swagger UI).

### Useful Docker Compose commands

```bash
# View logs for all services
docker-compose logs -f

# View logs for a specific service
docker-compose logs -f backend

# Stop all services (keep data volumes)
docker-compose stop

# Stop and remove containers + volumes (full reset)
docker-compose down -v

# Rebuild images after code changes
docker-compose up -d --build
```

---

## Option 2: Local Development

Run each service directly on your machine for faster iteration (no Docker rebuild on code changes).

### Backend Setup

```bash
# 1. Navigate to the backend directory
cd apps/backend

# 2. Create a Python virtual environment
python -m venv .venv

# 3. Activate the virtual environment
# On Linux/macOS:
source .venv/bin/activate
# On Windows (PowerShell):
.venv\Scripts\activate

# 4. Install the package in editable mode with dev dependencies
pip install -e ".[dev]"

# 5. Copy and edit the environment file
cp .env.example .env
# Open .env and set:
#   DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/emotion_db
#   JWT_SECRET=<a long random string>

# 6. Run database migrations
alembic upgrade head

# 7. Start the backend with hot reload
uvicorn src.main:app --reload --port 8000
```

The backend will be available at `http://localhost:8000`.
Interactive API docs: `http://localhost:8000/docs`.

### Frontend Setup

Open a new terminal tab/window:

```bash
# 1. Navigate to the frontend directory
cd apps/frontend

# 2. Install Node.js dependencies
npm install

# 3. Copy the environment file
cp .env.example .env.local
# The default value NEXT_PUBLIC_API_URL=http://localhost:8000 works for local dev.

# 4. Start the Next.js development server
npm run dev
```

The frontend will be available at `http://localhost:3000`.

### Database Setup

1. Install PostgreSQL 15 on your system (see https://www.postgresql.org/download/).
2. Start the PostgreSQL service.
3. Create the database:

```bash
psql -U postgres -c "CREATE DATABASE emotion_db;"
```

4. Update `DATABASE_URL` in `apps/backend/.env`:

```
DATABASE_URL=postgresql+asyncpg://postgres:<your-password>@localhost:5432/emotion_db
```

5. Run migrations from the backend directory (with the virtual environment active):

```bash
alembic upgrade head
```

---

## Environment Variables

### Root / Docker Compose (`.env`)

| Variable                | Default                                                | Description                                          |
|-------------------------|--------------------------------------------------------|------------------------------------------------------|
| `POSTGRES_USER`         | `postgres`                                             | PostgreSQL superuser name                            |
| `POSTGRES_PASSWORD`     | `password`                                             | PostgreSQL superuser password                        |
| `POSTGRES_DB`           | `emotion_db`                                           | Database name                                        |
| `DATABASE_URL`          | `postgresql+asyncpg://postgres:password@db:5432/emotion_db` | Async SQLAlchemy connection string            |
| `JWT_SECRET`            | (must be set)                                          | Secret key for signing JWT tokens — use a long random string |
| `JWT_ALGORITHM`         | `HS256`                                                | JWT signing algorithm                                |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15`                                           | Lifetime of access tokens in minutes                 |
| `REFRESH_TOKEN_EXPIRE_DAYS`   | `7`                                            | Lifetime of refresh tokens in days                   |
| `AI_SERVICE_BASE_URL`   | `http://ai-service:9000`                               | Internal URL of the AI Service microservice          |
| `CORS_ORIGINS`          | `http://localhost:3000`                                | Comma-separated list of allowed CORS origins         |
| `ENVIRONMENT`           | `development`                                          | `development` or `production`                        |

### Frontend (`apps/frontend/.env.local`)

| Variable                 | Default                    | Description                                      |
|--------------------------|----------------------------|--------------------------------------------------|
| `NEXT_PUBLIC_API_URL`    | `http://localhost:8000`    | Base URL of the backend REST API                 |
| `NEXT_PUBLIC_WS_URL`     | `ws://localhost:8000`      | Base URL for WebSocket connections               |

---

## Verification

### 1. Backend health check

```bash
curl http://localhost:8000/api/v1/health
```

Expected response:

```json
{"status": "ok", "version": "1.0.0"}
```

### 2. Register a new user

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123",
    "full_name": "Test User"
  }'
```

Expected response: `201 Created` with a user object.

### 3. Login

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123"
  }'
```

Expected response: `200 OK` with `access_token` and `refresh_token`.

### 4. Frontend

Open `http://localhost:3000` in a browser. You should see the landing page. Navigate to `/register` to create an account and `/login` to sign in.
