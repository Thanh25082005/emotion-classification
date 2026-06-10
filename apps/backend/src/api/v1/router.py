from fastapi import APIRouter
from .routes import auth_routes, user_routes, emotion_routes, realtime_routes, health_routes

api_router = APIRouter()

api_router.include_router(auth_routes.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(user_routes.router, prefix="/users", tags=["Users"])
api_router.include_router(emotion_routes.router, prefix="/emotions", tags=["Emotions"])
api_router.include_router(realtime_routes.router, prefix="/realtime", tags=["Realtime"])
api_router.include_router(health_routes.router, prefix="", tags=["Health"])
