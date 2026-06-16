import torch
import torch.nn as nn
from pathlib import Path
from ..core.logging import get_logger
from ..core.errors import ModelNotLoadedError

logger = get_logger(__name__)

NUM_CLASSES = 7


class ClassifierLoader:
    def __init__(self):
        self._model = None
        self._device: str = "cpu"
        self._loaded = False

    def load(self, model_path: str, device: str = "cpu") -> None:
        path = Path(model_path)
        if not path.exists():
            logger.error("EfficientNet weights not found: %s", model_path)
            self._loaded = False
            return

        try:
            from torchvision import models
            model = models.efficientnet_b2(weights=None)
            in_features = model.classifier[1].in_features
            model.classifier[1] = nn.Sequential(
                nn.Dropout(p=0.5, inplace=True),
                nn.Linear(in_features, NUM_CLASSES),
            )
            state = torch.load(str(path), map_location=device)
            model.load_state_dict(state)
            model = model.to(device)
            model.eval()
            self._model = model
            self._device = device
            self._loaded = True
            logger.info("EfficientNet-B2 emotion classifier loaded from %s on %s", model_path, device)
        except Exception as e:
            logger.error("Failed to load emotion classifier: %s", e)
            self._loaded = False

    @property
    def loaded(self) -> bool:
        return self._loaded

    @property
    def device(self) -> str:
        return self._device

    @property
    def model(self):
        if not self._loaded:
            raise ModelNotLoadedError("emotion-classifier")
        return self._model
