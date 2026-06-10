from fastapi import APIRouter
from ....api.v1.schemas.user_schema import UserResponse, UpdateUserRequest
from ....api.v1.dependencies import CurrentUser, DBSession
from ....modules.users.service import UserService

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: CurrentUser):
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_my_profile(data: UpdateUserRequest, current_user: CurrentUser, db: DBSession):
    return await UserService(db).update_user(current_user, data)
