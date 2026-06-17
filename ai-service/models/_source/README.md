# Emotion Classification System

Web-based facial emotion classification system with real-time capabilities.

## Tech Stack
- **Backend**: Python 3.11, FastAPI, SQLAlchemy 2.0, Alembic, PostgreSQL
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Zustand
- **Realtime**: WebSocket
- **AI Service**: Separate microservice (see services/ai-service/ — to be implemented)

## Architecture
```
Frontend (Next.js :3000)
       ↕  REST API + WebSocket
Backend (FastAPI :8000)
       ↕  Internal HTTP
AI Service (:9000)  [to be implemented]
       ↕
PostgreSQL (:5432)
```

## Quick Start
```bash
cp .env.example .env
docker-compose up -d
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
# API Docs: http://localhost:8000/docs
```

## Project Structure
```
emotion-classification/
├── apps/
│   ├── backend/        # FastAPI Python backend
│   └── frontend/       # Next.js TypeScript frontend
├── services/
│   └── ai-service/     # AI service placeholder (to be implemented)
├── packages/shared/    # Shared contracts and types
├── docs/               # Documentation
├── infra/              # Infrastructure configs
└── scripts/            # Helper scripts
```

## Documentation
- [Architecture](docs/architecture.md)
- [Setup Guide](docs/setup.md)
- [Database Schema](docs/database-schema.md)
- [AI Service Integration](docs/ai-service-integration-guide.md)
- [Development Report](docs/development-report.md)
