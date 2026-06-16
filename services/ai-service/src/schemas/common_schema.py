from pydantic import BaseModel
from typing import Optional


class ErrorDetail(BaseModel):
    code: str
    message: str


class BaseResponse(BaseModel):
    request_id: Optional[str] = None
    status: str
    processing_time_ms: Optional[float] = None
