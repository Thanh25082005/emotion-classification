from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime
import re


class RegisterRequest(BaseModel):
    email: EmailStr
    full_name: str
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Họ tên không được để trống")
        if len(v) < 2:
            raise ValueError("Họ tên phải có ít nhất 2 ký tự")
        if len(v) > 100:
            raise ValueError("Họ tên không được quá 100 ký tự")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        errors = []
        if len(v) < 8:
            errors.append("ít nhất 8 ký tự")
        if not re.search(r"[A-Z]", v):
            errors.append("ít nhất 1 chữ hoa")
        if not re.search(r"[a-z]", v):
            errors.append("ít nhất 1 chữ thường")
        if not re.search(r"\d", v):
            errors.append("ít nhất 1 chữ số")
        if errors:
            raise ValueError("Mật khẩu cần có: " + ", ".join(errors))
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    can_upload: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class AuthResponse(BaseModel):
    success: bool
    data: TokenResponse
