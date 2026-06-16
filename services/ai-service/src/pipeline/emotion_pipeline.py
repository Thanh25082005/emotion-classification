import time
import uuid
import numpy as np
from typing import Optional
from ..core.logging import get_logger
from ..models.registry import registry
from ..schemas.inference_schema import (
    InferenceSuccessResponse,
    InferenceErrorResponse,
    FaceResult,
    BoundingBox,
    EmotionScores,
)
from ..vision.face_detector import detect_faces
from ..vision.face_cropper import crop_face
from ..vision.image_utils import bgr_to_pil, validate_image_size
from .preprocessor import preprocess_face
from .postprocessor import compute_scores

logger = get_logger(__name__)


def _run_inference(
    frame: np.ndarray,
    request_id: str,
    session_id: Optional[str] = None,
) -> InferenceSuccessResponse | InferenceErrorResponse:
    start = time.time()

    if not registry.detector.loaded:
        elapsed = round((time.time() - start) * 1000, 2)
        return InferenceErrorResponse(
            request_id=request_id,
            processing_time_ms=elapsed,
            error={"code": "MODEL_NOT_LOADED", "message": "Face detector is not loaded"},
        )

    if not registry.classifier.loaded:
        elapsed = round((time.time() - start) * 1000, 2)
        return InferenceErrorResponse(
            request_id=request_id,
            processing_time_ms=elapsed,
            error={"code": "MODEL_NOT_LOADED", "message": "Emotion classifier is not loaded"},
        )

    try:
        bboxes = detect_faces(registry.detector.model, frame)
    except Exception as e:
        logger.exception("Face detection failed: %s", e)
        elapsed = round((time.time() - start) * 1000, 2)
        return InferenceErrorResponse(
            request_id=request_id,
            processing_time_ms=elapsed,
            error={"code": "MODEL_INFERENCE_ERROR", "message": str(e)},
        )

    if not bboxes:
        elapsed = round((time.time() - start) * 1000, 2)
        return InferenceErrorResponse(
            request_id=request_id,
            processing_time_ms=elapsed,
            error={"code": "NO_FACE_DETECTED", "message": "No face detected in the image"},
        )

    face_results = []
    import torch
    device = registry.classifier.device
    model = registry.classifier.model

    for idx, bbox in enumerate(bboxes):
        x1, y1, x2, y2 = bbox
        crop = crop_face(frame, bbox)
        if not validate_image_size(crop):
            continue

        try:
            pil_img = bgr_to_pil(crop)
            tensor = preprocess_face(pil_img, device=device)

            with torch.no_grad():
                logits = model(tensor)

            emotion, confidence, scores = compute_scores(logits)
        except Exception as e:
            logger.warning("Inference failed for face %d: %s", idx, e)
            continue

        face_results.append(
            FaceResult(
                face_id=f"face-{idx + 1}",
                box=BoundingBox(x=x1, y=y1, width=x2 - x1, height=y2 - y1),
                emotion=emotion,
                confidence=round(confidence, 4),
                scores=EmotionScores(**{k: round(v, 4) for k, v in scores.items()}),
            )
        )

    elapsed = round((time.time() - start) * 1000, 2)

    if not face_results:
        return InferenceErrorResponse(
            request_id=request_id,
            processing_time_ms=elapsed,
            error={"code": "NO_FACE_DETECTED", "message": "No valid face region found"},
        )

    return InferenceSuccessResponse(
        request_id=request_id,
        processing_time_ms=elapsed,
        faces=face_results,
    )


def predict_image(
    image: np.ndarray,
    request_id: Optional[str] = None,
) -> InferenceSuccessResponse | InferenceErrorResponse:
    req_id = request_id or str(uuid.uuid4())
    logger.info("predict_image request_id=%s", req_id)
    return _run_inference(image, request_id=req_id)


def predict_frame(
    frame: np.ndarray,
    request_id: Optional[str] = None,
    session_id: Optional[str] = None,
) -> InferenceSuccessResponse | InferenceErrorResponse:
    req_id = request_id or str(uuid.uuid4())
    logger.info("predict_frame request_id=%s session_id=%s", req_id, session_id)
    return _run_inference(frame, request_id=req_id, session_id=session_id)
