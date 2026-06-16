import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from .core.config import settings
from .core.logging import setup_logging, get_logger
from .models.registry import registry
from .api.router import router

setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting AI Service — loading models...")
    await asyncio.to_thread(registry.load_all)
    yield
    logger.info("Shutting down AI Service")


app = FastAPI(
    title="Emotion Classification AI Service",
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url=None,
)

app.include_router(router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={
            "request_id": None,
            "status": "error",
            "error": {"code": "INTERNAL_SERVER_ERROR", "message": "An unexpected error occurred"},
            "processing_time_ms": 0,
        },
    )
