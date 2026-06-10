import uuid
from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UpdateUserRequest(BaseModel):
    full_name: Optional[str] = None
