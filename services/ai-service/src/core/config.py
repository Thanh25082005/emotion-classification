import torch
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    app_name: str = "ai-service"
    app_version: str = "1.0.0"
    host: str = "0.0.0.0"
    port: int = 9000
    log_level: str = "INFO"

    yolo_model_path: str = str(BASE_DIR / "weights" / "best.pt")
    emotion_model_path: str = str(BASE_DIR / "weights" / "efficientnet_b2_fer2013.pth")

    yolo_conf_threshold: float = 0.5
    device: str = "auto"

    @property
    def torch_device(self) -> str:
        if self.device == "auto":
            return "cuda" if torch.cuda.is_available() else "cpu"
        return self.device

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
