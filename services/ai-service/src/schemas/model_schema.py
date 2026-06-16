from pydantic import BaseModel
from typing import List


class ModelComponentInfo(BaseModel):
    name: str
    loaded: bool


class ModelInfoResponse(BaseModel):
    model_name: str = "emotion-classification-service"
    model_version: str = "1.0.0"
    detector: ModelComponentInfo
    classifier: ModelComponentInfo
    labels: List[str]
    input_type: List[str]
    supports_multiple_faces: bool = True


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
