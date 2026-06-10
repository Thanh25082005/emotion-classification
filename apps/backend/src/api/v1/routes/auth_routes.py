from fastapi import APIRouter
from ....api.v1.schemas.auth_schema import (
    RegisterRequest, LoginRequest, RefreshTokenRequest,
    TokenResponse, UserResponse, MessageResponse,
)
from ....api.v1.dependencies import CurrentUser, DBSession
from ....modules.auth.service import AuthService

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(data: RegisterRequest, db: DBSession):
    return await AuthService(db).register(data)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: DBSession):
    return await AuthService(db).login(data)


@router.post("/refresh-token", response_model=TokenResponse)
async def refresh_token(data: RefreshTokenRequest, db: DBSession):
    return await AuthService(db).refresh_token(data.refresh_token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: CurrentUser):
    return current_user


@router.post("/logout", response_model=MessageResponse)
async def logout(current_user: CurrentUser, db: DBSession):
    await AuthService(db).revoke_user_tokens(str(current_user.id))
    return MessageResponse(message="Logged out successfully")
