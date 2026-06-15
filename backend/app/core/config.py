"""
Cau hinh backend, doc tu bien moi truong / file .env.
KHONG hardcode secret -- xem .env.example.
"""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/core/config.py -> parents[3] = goc repo (CV_project)
PROJECT_ROOT = Path(__file__).resolve().parents[3]
AI_SERVICE_DIR = PROJECT_ROOT / "ai-service"
MODELS_DIR = AI_SERVICE_DIR / "models"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- Auth (dung tu Phase 4, dat san de khong vo .env) ---
    SECRET_KEY: str = "dev-secret-doi-truoc-khi-deploy"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 ngay

    # --- Database (dung tu Phase 4) ---
    DB_URL: str = f"sqlite:///{PROJECT_ROOT / 'emotion.db'}"

    # --- Model ONNX (Phase 2) ---
    YOLO_ONNX: str = str(MODELS_DIR / "face_yolo.onnx")
    EFFNET_ONNX: str = str(MODELS_DIR / "emotion_effnet.onnx")
    CONF: float = 0.4  # nguong confidence cho YOLO

    # --- CORS: cho phep Vite dev server ---
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
