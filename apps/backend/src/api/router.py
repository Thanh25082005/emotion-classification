from fastapi import APIRouter
from .v1 import auth_routes, emotion_routes, ai_service_routes, realtime_routes

router = APIRouter(prefix="/api/v1")

router.include_router(auth_routes.router)
router.include_router(emotion_routes.router)
router.include_router(ai_service_routes.router)
router.include_router(realtime_routes.router)
