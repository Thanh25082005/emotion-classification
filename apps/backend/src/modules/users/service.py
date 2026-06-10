from ...api.v1.schemas.user_schema import UpdateUserRequest
from ...db.models.user import User
from .repository import UserRepository


class UserService:
    def __init__(self, db):
        self.repo = UserRepository(db)

    async def update_user(self, user: User, data: UpdateUserRequest) -> User:
        updates = data.model_dump(exclude_none=True)
        return await self.repo.update(user, **updates)
