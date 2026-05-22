from fastapi import APIRouter
from .characters import router as characters_router
from .personas import router as personas_router
from .chats import router as chats_router
from .models import router as models_router
from .backgrounds import router as backgrounds_router
from .system import router as system_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(characters_router)
api_router.include_router(personas_router)
api_router.include_router(chats_router)
api_router.include_router(models_router)
api_router.include_router(backgrounds_router)
api_router.include_router(system_router)
