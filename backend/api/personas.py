from fastapi import APIRouter, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from datetime import datetime, timezone
from pathlib import Path

from backend.core import Persona
from backend.db.storage import save, load, load_all, delete, exists, DATA_ROOT
from backend.api.schemas import PersonaCreate, PersonaUpdate, PersonaResponse

router = APIRouter(prefix="/personas", tags=["personas"])

ENTITY      = "personas"
PERSONAS_DIR = DATA_ROOT / "personas"
PERSONAS_DIR.mkdir(parents=True, exist_ok=True)


def _avatar_path(persona_id: str) -> Path:
    return PERSONAS_DIR / f"{persona_id}.png"


def _to_response(p: Persona) -> PersonaResponse:
    return PersonaResponse(**p.model_dump())


def _clear_default(exclude_id: str = None):
    """Garantiza que solo una persona tenga is_default=True."""
    for p in load_all(ENTITY, Persona):
        if p.is_default and p.id != exclude_id:
            p.is_default = False
            save(ENTITY, p.id, p)


@router.get("/", response_model=list[PersonaResponse])
async def list_personas():
    return [_to_response(p) for p in load_all(ENTITY, Persona)]


@router.get("/{persona_id}", response_model=PersonaResponse)
async def get_persona(persona_id: str):
    p = load(ENTITY, persona_id, Persona)
    if not p:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    return _to_response(p)


@router.post("/", response_model=PersonaResponse, status_code=status.HTTP_201_CREATED)
async def create_persona(body: PersonaCreate):
    p = Persona(**body.model_dump())
    if p.is_default:
        _clear_default(exclude_id=p.id)
    save(ENTITY, p.id, p)
    return _to_response(p)


@router.patch("/{persona_id}", response_model=PersonaResponse)
async def update_persona(persona_id: str, body: PersonaUpdate):
    p = load(ENTITY, persona_id, Persona)
    if not p:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    updated = p.model_copy(
        update={k: v for k, v in body.model_dump().items() if v is not None}
    )
    updated.updated_at = datetime.now(timezone.utc)
    if updated.is_default:
        _clear_default(exclude_id=persona_id)
    save(ENTITY, persona_id, updated)
    return _to_response(updated)


@router.delete("/{persona_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_persona(persona_id: str):
    if not exists(ENTITY, persona_id):
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    delete(ENTITY, persona_id)


@router.post("/{persona_id}/set-default", response_model=PersonaResponse)
async def set_default_persona(persona_id: str):
    p = load(ENTITY, persona_id, Persona)
    if not p:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    _clear_default(exclude_id=persona_id)
    p.is_default = True
    p.updated_at = datetime.now(timezone.utc)
    save(ENTITY, persona_id, p)
    return _to_response(p)


@router.get("/{persona_id}/avatar")
async def get_persona_avatar(persona_id: str):
    path = _avatar_path(persona_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Sin avatar")
    return FileResponse(path, media_type="image/png")


@router.post("/{persona_id}/avatar", response_model=PersonaResponse)
async def upload_persona_avatar(persona_id: str, file: UploadFile = File(...)):
    p = load(ENTITY, persona_id, Persona)
    if not p:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    data = await file.read()
    _avatar_path(persona_id).write_bytes(data)
    p.avatar_path = f"/api/v1/personas/{persona_id}/avatar"
    p.updated_at = datetime.now(timezone.utc)
    save(ENTITY, persona_id, p)
    return _to_response(p)
