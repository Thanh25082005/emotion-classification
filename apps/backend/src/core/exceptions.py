from fastapi import HTTPException, status


class AppException(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class UnauthorizedException(AppException):
    def __init__(self, message: str = "Authentication required"):
        super().__init__("UNAUTHORIZED", message, status.HTTP_401_UNAUTHORIZED)


class ForbiddenException(AppException):
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__("FORBIDDEN", message, status.HTTP_403_FORBIDDEN)


class NotFoundException(AppException):
    def __init__(self, resource: str = "Resource"):
        super().__init__("NOT_FOUND", f"{resource} not found", status.HTTP_404_NOT_FOUND)


class UserAlreadyExistsException(AppException):
    def __init__(self):
        super().__init__("USER_ALREADY_EXISTS", "Email already registered", status.HTTP_409_CONFLICT)


class InvalidCredentialsException(AppException):
    def __init__(self):
        super().__init__("INVALID_CREDENTIALS", "Invalid email or password", status.HTTP_401_UNAUTHORIZED)


class AIServiceUnavailableException(AppException):
    def __init__(self, detail: str = ""):
        msg = "AI Service is not available. Please try again later."
        if detail:
            msg = f"{msg} Detail: {detail}"
        super().__init__("AI_SERVICE_UNAVAILABLE", msg, status.HTTP_503_SERVICE_UNAVAILABLE)


class AIServiceTimeoutException(AppException):
    def __init__(self):
        super().__init__("AI_SERVICE_TIMEOUT", "AI Service request timed out", status.HTTP_504_GATEWAY_TIMEOUT)


class NoFaceDetectedException(AppException):
    def __init__(self):
        super().__init__("NO_FACE_DETECTED", "No face detected in the image", status.HTTP_422_UNPROCESSABLE_ENTITY)
