from fastapi import APIRouter, Depends
from ...core.security import get_current_user
from ...models.user import User
from ...clients.ai_service_client import get_health, get_model_info, AIServiceError

router = APIRouter(prefix="/ai-service", tags=["ai-service"])


@router.get("/health")
async def proxy_ai_health():
    try:
        data = await get_health()
        return {"success": True, "data": data}
    except AIServiceError as e:
        return {"success": False, "error": {"code": e.code, "message": e.message}}


@router.get("/model-info")
async def proxy_model_info(current_user: User = Depends(get_current_user)):
    try:
        data = await get_model_info()
        return {"success": True, "data": data}
    except AIServiceError as e:
        return {"success": False, "error": {"code": e.code, "message": e.message}}
