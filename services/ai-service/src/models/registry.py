from .detector_loader import DetectorLoader
from .classifier_loader import ClassifierLoader
from ..core.config import settings
from ..core.logging import get_logger

logger = get_logger(__name__)


class ModelRegistry:
    def __init__(self):
        self.detector = DetectorLoader()
        self.classifier = ClassifierLoader()

    def load_all(self) -> None:
        device = settings.torch_device
        logger.info("Loading models on device: %s", device)
        self.detector.load(settings.yolo_model_path)
        self.classifier.load(settings.emotion_model_path, device=device)
        logger.info(
            "Model registry ready — detector=%s classifier=%s",
            self.detector.loaded,
            self.classifier.loaded,
        )

    @property
    def all_loaded(self) -> bool:
        return self.detector.loaded and self.classifier.loaded


registry = ModelRegistry()
