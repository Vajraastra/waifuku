from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
from backend.db.storage import DATA_ROOT

router = APIRouter(prefix="/backgrounds", tags=["backgrounds"])

BACKGROUNDS_DIR = DATA_ROOT / "backgrounds"
BACKGROUNDS_DIR.mkdir(parents=True, exist_ok=True)

_SUPPORTED = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}


@router.get("/")
async def list_backgrounds():
    files = sorted(
        f.name for f in BACKGROUNDS_DIR.iterdir()
        if f.is_file() and f.suffix.lower() in _SUPPORTED
    )
    return {"backgrounds": files}


@router.get("/{filename}")
async def get_background(filename: str):
    resolved = (BACKGROUNDS_DIR / filename).resolve()
    if not str(resolved).startswith(str(BACKGROUNDS_DIR.resolve())):
        raise HTTPException(status_code=403, detail="Acceso denegado")
    if not resolved.exists() or not resolved.is_file():
        raise HTTPException(status_code=404, detail="Fondo no encontrado")
    return FileResponse(resolved)
