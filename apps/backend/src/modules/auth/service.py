from datetime import datetime, timedelta, timezone
from ...core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_token,
)
from ...core.exceptions import (
    UserAlreadyExistsException, InvalidCredentialsException, UnauthorizedException,
)
from ...core.config import settings
from ...api.v1.schemas.auth_schema import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from .repository import UserRepository


class AuthService:
    def __init__(self, db):
        self.repo = UserRepository(db)

    async def register(self, data: RegisterRequest):
        existing = await self.repo.get_by_email(data.email)
        if existing:
            raise UserAlreadyExistsException()
        hashed = hash_password(data.password)
        user = await self.repo.create(data.email, hashed, data.full_name)
        return user

    async def login(self, data: LoginRequest) -> TokenResponse:
        user = await self.repo.get_by_email(data.email)
        if not user or not verify_password(data.password, user.password_hash):
            raise InvalidCredentialsException()
        if not user.is_active:
            raise UnauthorizedException("Account is disabled")

        access_token = create_access_token({"sub": str(user.id)})
        refresh_token = create_refresh_token({"sub": str(user.id)})
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        await self.repo.save_refresh_token(user.id, refresh_token, expires_at)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse.model_validate(user),
        )

    async def refresh_token(self, token: str) -> TokenResponse:
        try:
            payload = decode_token(token)
            if payload.get("type") != "refresh":
                raise UnauthorizedException("Invalid token type")
            user_id = payload.get("sub")
        except ValueError:
            raise UnauthorizedException("Invalid or expired refresh token")

        stored = await self.repo.get_refresh_token(token)
        if not stored or not stored.is_valid:
            raise UnauthorizedException("Refresh token is invalid or expired")

        user = await self.repo.get_by_id(user_id)
        if not user or not user.is_active:
            raise UnauthorizedException("User not found")

        new_access = create_access_token({"sub": str(user.id)})
        new_refresh = create_refresh_token({"sub": str(user.id)})
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        await self.repo.save_refresh_token(user.id, new_refresh, expires_at)

        return TokenResponse(
            access_token=new_access,
            refresh_token=new_refresh,
            user=UserResponse.model_validate(user),
        )

    async def revoke_user_tokens(self, user_id: str) -> None:
        await self.repo.revoke_all_user_tokens(user_id)
