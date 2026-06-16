from fastapi import HTTPException


class AIServiceError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 500):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class InvalidImageError(AIServiceError):
    def __init__(self, message: str = "Invalid or unreadable image"):
        super().__init__("INVALID_IMAGE", message, 422)


class NoFaceDetectedError(AIServiceError):
    def __init__(self):
        super().__init__("NO_FACE_DETECTED", "No face detected in the image", 200)


class ModelNotLoadedError(AIServiceError):
    def __init__(self, model_name: str = "model"):
        super().__init__("MODEL_NOT_LOADED", f"{model_name} is not loaded", 503)


class ModelInferenceError(AIServiceError):
    def __init__(self, message: str = "Model inference failed"):
        super().__init__("MODEL_INFERENCE_ERROR", message, 500)
