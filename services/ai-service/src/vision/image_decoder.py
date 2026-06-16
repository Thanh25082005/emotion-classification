import base64
import numpy as np
import cv2
from ..core.errors import InvalidImageError
from ..core.logging import get_logger

logger = get_logger(__name__)


def decode_base64_image(b64_string: str) -> np.ndarray:
    try:
        if "," in b64_string:
            b64_string = b64_string.split(",", 1)[1]
        data = base64.b64decode(b64_string)
        arr = np.frombuffer(data, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise InvalidImageError("Could not decode base64 image data")
        return img
    except InvalidImageError:
        raise
    except Exception as e:
        logger.debug("Base64 decode error: %s", e)
        raise InvalidImageError(f"Failed to decode image: {e}")


def decode_bytes_image(data: bytes) -> np.ndarray:
    try:
        arr = np.frombuffer(data, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise InvalidImageError("Could not decode uploaded image bytes")
        return img
    except InvalidImageError:
        raise
    except Exception as e:
        raise InvalidImageError(f"Failed to decode image bytes: {e}")
