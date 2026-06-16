import os
from pathlib import Path
from ..core.logging import get_logger

logger = get_logger(__name__)

_WEIGHTS = [
    {
        "name": "YOLO face detector (best.pt)",
        "gdrive_id": "13Te5fc_crgv5t59ipL7X0xX5vVJ50-_w",
        "path_env": "YOLO_MODEL_PATH",
        "fallback": "/app/weights/best.pt",
    },
    {
        "name": "EfficientNet-B2 emotion classifier",
        "gdrive_id": "1Z5zauGzmCN1uvr6GAaJVvGwZkukCGdS2",
        "path_env": "EMOTION_MODEL_PATH",
        "fallback": "/app/weights/efficientnet_b2_fer2013.pth",
    },
]


def ensure_weights() -> None:
    """Download missing model weights from Google Drive at startup."""
    import gdown

    for w in _WEIGHTS:
        dest = Path(os.getenv(w["path_env"], w["fallback"]))

        if dest.exists():
            size_mb = dest.stat().st_size / 1_000_000
            logger.info("Weight OK: %s (%.1f MB)", w["name"], size_mb)
            continue

        dest.parent.mkdir(parents=True, exist_ok=True)
        logger.info("Downloading %s → %s", w["name"], dest)

        try:
            gdown.download(
                id=w["gdrive_id"],
                output=str(dest),
                quiet=False,
                fuzzy=True,
            )
        except Exception as exc:
            raise RuntimeError(
                f"Failed to download '{w['name']}' from Google Drive: {exc}"
            ) from exc

        if not dest.exists():
            raise RuntimeError(
                f"Download reported success but file missing: {dest}. "
                "Check that the Google Drive link is publicly accessible."
            )

        logger.info("Downloaded %s (%.1f MB)", w["name"], dest.stat().st_size / 1_000_000)
