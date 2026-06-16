from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from typing import Union
from ...schemas.inference_schema import (
    InferenceSuccessResponse,
    InferenceErrorResponse,
    FrameRequest,
)
from ...vision.image_decoder import decode_base64_image, decode_bytes_image
from ...core.errors import InvalidImageError
from ...pipeline.emotion_pipeline import predict_image, predict_frame
from ...core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()

_NO_IMAGE = InferenceErrorResponse(
    processing_time_ms=0,
    error={"code": "INVALID_IMAGE", "message": "No image provided. Send multipart file or JSON image_base64."},
)


@router.post(
    "/inference/image",
    response_model=Union[InferenceSuccessResponse, InferenceErrorResponse],
)
async def inference_image(request: Request):
    content_type = request.headers.get("content-type", "")

    if "multipart/form-data" in content_type:
        form = await request.form()
        file = form.get("file")
        request_id = form.get("request_id")
        if file is None:
            return _NO_IMAGE
        try:
            data = await file.read()
            img = decode_bytes_image(data)
        except InvalidImageError as e:
            return InferenceErrorResponse(
                request_id=request_id,
                processing_time_ms=0,
                error={"code": e.code, "message": e.message},
            )
        return predict_image(img, request_id=request_id)

    if "application/json" in content_type:
        try:
            body = await request.json()
        except Exception:
            return InferenceErrorResponse(
                processing_time_ms=0,
                error={"code": "INVALID_IMAGE", "message": "Invalid JSON body"},
            )
        b64 = body.get("image_base64")
        request_id = body.get("request_id")
        if not b64:
            return _NO_IMAGE
        try:
            img = decode_base64_image(b64)
        except InvalidImageError as e:
            return InferenceErrorResponse(
                request_id=request_id,
                processing_time_ms=0,
                error={"code": e.code, "message": e.message},
            )
        return predict_image(img, request_id=request_id)

    return _NO_IMAGE


@router.post(
    "/inference/frame",
    response_model=Union[InferenceSuccessResponse, InferenceErrorResponse],
)
async def inference_frame(body: FrameRequest):
    try:
        img = decode_base64_image(body.frame_base64)
    except InvalidImageError as e:
        return InferenceErrorResponse(
            request_id=body.request_id,
            processing_time_ms=0,
            error={"code": e.code, "message": e.message},
        )
    return predict_frame(img, request_id=body.request_id, session_id=body.session_id)
