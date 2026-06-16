import base64
import numpy as np
import cv2
import pytest
from src.vision.image_decoder import decode_base64_image, decode_bytes_image
from src.core.errors import InvalidImageError


def _make_test_image_bytes() -> bytes:
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    img[40:60, 40:60] = [200, 200, 200]
    _, buf = cv2.imencode('.jpg', img)
    return buf.tobytes()


def test_decode_bytes_image_valid():
    img_bytes = _make_test_image_bytes()
    img = decode_bytes_image(img_bytes)
    assert img is not None
    assert img.shape[2] == 3


def test_decode_bytes_image_invalid():
    with pytest.raises(InvalidImageError):
        decode_bytes_image(b"not_an_image")


def test_decode_base64_image_valid():
    img_bytes = _make_test_image_bytes()
    b64 = base64.b64encode(img_bytes).decode()
    img = decode_base64_image(b64)
    assert img is not None


def test_decode_base64_image_invalid():
    with pytest.raises(InvalidImageError):
        decode_base64_image("not_valid_base64!!!")
