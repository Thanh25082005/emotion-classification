from pathlib import Path
from ..core.logging import get_logger
from ..core.errors import ModelNotLoadedError

logger = get_logger(__name__)


class DetectorLoader:
    def __init__(self):
        self._model = None
        self._loaded = False
        self._model_path: str = ""

    def load(self, model_path: str) -> None:
        path = Path(model_path)
        if not path.exists():
            logger.error("YOLO weights not found: %s", model_path)
            self._loaded = False
            return

        try:
            from ultralytics import YOLO
            self._model = YOLO(str(path))
            self._model_path = model_path
            self._loaded = True
            logger.info("YOLO face detector loaded from %s", model_path)
        except Exception as e:
            logger.error("Failed to load YOLO detector: %s", e)
            self._loaded = False

    @property
    def loaded(self) -> bool:
        return self._loaded

    @property
    def model(self):
        if not self._loaded:
            raise ModelNotLoadedError("face-detector")
        return self._model
