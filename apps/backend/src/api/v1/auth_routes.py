from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ...core.database import get_db
from ...core.security import hash_password, verify_password, create_access_token, get_current_user, require_admin
from ...models.user import User
from ...schemas.auth_schema import RegisterRequest, LoginRequest, AuthResponse, UserResponse, TokenResponse
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "USER_ALREADY_EXISTS", "message": "Email is already registered"},
        )

    user = User(
        email=body.email,
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    token = create_access_token(user.id)
    return AuthResponse(
        success=True,
        data=TokenResponse(
            access_token=token,
            user=UserResponse.model_validate(user),
        ),
    )


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email, User.is_active == True))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_CREDENTIALS", "message": "Invalid email or password"},
        )

    token = create_access_token(user.id)
    return AuthResponse(
        success=True,
        data=TokenResponse(
            access_token=token,
            user=UserResponse.model_validate(user),
        ),
    )


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {"success": True, "data": UserResponse.model_validate(current_user)}


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    return {"success": True, "message": "Logged out successfully"}


class UploadPermissionRequest(BaseModel):
    can_upload: bool


@router.get("/users", response_model=dict)
async def list_users(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).order_by(User.created_at))
    users = result.scalars().all()
    return {"success": True, "data": [UserResponse.model_validate(u) for u in users]}


@router.patch("/users/{user_id}/upload-permission")
async def set_upload_permission(
    user_id: str,
    body: UploadPermissionRequest,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "USER_NOT_FOUND", "message": "User not found"},
        )
    target.can_upload = body.can_upload
    await db.flush()
    await db.refresh(target)
    return {"success": True, "data": UserResponse.model_validate(target)}
