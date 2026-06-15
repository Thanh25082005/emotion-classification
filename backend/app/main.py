"""
Khoi tao FastAPI:
- Nap EmotionPipeline MOT LAN luc startup (lifespan).
- Bat CORS cho Vite dev (http://localhost:5173).
- Gan router REST (/api) va WebSocket (/ws/emotion).
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, health, logs
from app.core.config import settings
from app.db.database import init_db
from app.services.inference import init_pipeline
from app.websocket import emotion_ws


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Tao bang DB + nap model 1 lan khi khoi dong (gotcha #7)
    init_db()
    init_pipeline()
    yield


app = FastAPI(title="Emotion Recognition Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST: prefix /api
app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(logs.router, prefix="/api")

# WebSocket: /ws/emotion (router tu khai bao duong dan day du)
app.include_router(emotion_ws.router)
