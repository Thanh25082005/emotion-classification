import uuid
import hashlib
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from ...db.models.user import User
from ...db.models.refresh_token import RefreshToken


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_email(self, email: str) -> User | None:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: str) -> User | None:
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def create(self, email: str, password_hash: str, full_name: str) -> User:
        user = User(email=email, password_hash=password_hash, full_name=full_name)
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def save_refresh_token(
        self, user_id: uuid.UUID, token: str, expires_at: datetime
    ) -> RefreshToken:
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        rt = RefreshToken(user_id=user_id, token_hash=token_hash, expires_at=expires_at)
        self.db.add(rt)
        await self.db.flush()
        return rt

    async def get_refresh_token(self, token: str) -> RefreshToken | None:
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        result = await self.db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        return result.scalar_one_or_none()

    async def revoke_all_user_tokens(self, user_id: str) -> None:
        now = datetime.now(timezone.utc)
        await self.db.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=now)
        )
