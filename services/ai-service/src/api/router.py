from fastapi import APIRouter
from .routes import health_routes, model_routes, inference_routes

router = APIRouter(prefix="/internal/v1")

router.include_router(health_routes.router, tags=["health"])
router.include_router(model_routes.router, tags=["model"])
router.include_router(inference_routes.router, tags=["inference"])
