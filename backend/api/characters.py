import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse

from backend.core import Character, CharacterCardV1, CharacterCardV2
from backend.db.storage import DATA_ROOT
from backend.api.schemas import CharacterCreate, CharacterUpdate, CharacterResponse
from backend.api.png_parser import extract_chara_from_png, detect_card_version

router = APIRouter(prefix="/characters", tags=["characters"])

CHARS_DIR     = DATA_ROOT / "characters"
OLD_AVATS_DIR = DATA_ROOT / "avatars"   # directorio legacy
CHARS_DIR.mkdir(parents=True, exist_ok=True)


# ── Almacenamiento por carpeta ─────────────────────────────────────────────────

def _folder(char_id: str) -> Path:
    d = CHARS_DIR / char_id
    d.mkdir(parents=True, exist_ok=True)
    return d

def _json_path(char_id: str) -> Path:
    return _folder(char_id) / "character.json"

def _avatar_path(char_id: str) -> Path:
    return _folder(char_id) / "avatar.png"

def _serializer(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"No serializable: {type(obj)}")

def _save_char(char: Character) -> None:
    _json_path(char.id).write_text(
        json.dumps(char.model_dump(), default=_serializer, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    _ensure_readme(char)

def _load_char(char_id: str) -> Character | None:
    _migrate_if_needed(char_id)
    path = _json_path(char_id)
    if not path.exists():
        return None
    return Character.model_validate_json(path.read_text(encoding="utf-8"))

def _load_all() -> list[Character]:
    # Migrar flat .json que aún no se hayan movido
    for old_json in list(CHARS_DIR.glob("*.json")):
        _migrate_if_needed(old_json.stem)

    results = []
    for folder in CHARS_DIR.iterdir():
        if not folder.is_dir():
            continue
        json_file = folder / "character.json"
        if not json_file.exists():
            continue
        try:
            results.append(Character.model_validate_json(json_file.read_text(encoding="utf-8")))
        except Exception:
            pass
    return results

def _char_exists(char_id: str) -> bool:
    return _json_path(char_id).exists() or (CHARS_DIR / f"{char_id}.json").exists()

def _delete_char(char_id: str) -> None:
    folder = CHARS_DIR / char_id
    if folder.exists():
        shutil.rmtree(folder)
    # Limpiar flat legacy si existe
    old = CHARS_DIR / f"{char_id}.json"
    if old.exists():
        old.unlink()
    old_av = OLD_AVATS_DIR / f"{char_id}.png"
    if old_av.exists():
        old_av.unlink()

def _migrate_if_needed(char_id: str) -> None:
    """Mueve data/characters/{id}.json → data/characters/{id}/character.json
    y data/avatars/{id}.png → data/characters/{id}/avatar.png."""
    old_json   = CHARS_DIR / f"{char_id}.json"
    new_json   = CHARS_DIR / char_id / "character.json"
    old_avatar = OLD_AVATS_DIR / f"{char_id}.png"

    if not old_json.exists() or new_json.exists():
        return

    folder = _folder(char_id)
    shutil.move(str(old_json), str(folder / "character.json"))

    if old_avatar.exists():
        shutil.move(str(old_avatar), str(folder / "avatar.png"))
        # Asegura que avatar_path apunte al nuevo endpoint
        try:
            char = Character.model_validate_json((folder / "character.json").read_text(encoding="utf-8"))
            char.avatar_path = f"/api/v1/characters/{char_id}/avatar"
            (folder / "character.json").write_text(
                json.dumps(char.model_dump(), default=_serializer, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
        except Exception:
            pass

def _save_avatar_bytes(char_id: str, data: bytes) -> str:
    _avatar_path(char_id).write_bytes(data)
    return f"/api/v1/characters/{char_id}/avatar"

def _ensure_readme(char: Character) -> None:
    readme = _folder(char.id) / "README.md"
    if readme.exists():
        return
    readme.write_text(
        f"# {char.name}\n\n"
        "Carpeta generada por Waifuku. No mover ni renombrar.\n\n"
        "## Archivos\n"
        "- `character.json` — datos del personaje (no editar manualmente)\n"
        "- `avatar.png` — imagen del personaje\n\n"
        "## Extensiones futuras\n"
        "Usuarios avanzados pueden agregar aquí:\n"
        "- `lorebook.json` — world info / lorebook\n"
        "- `items/` — items del sistema de slots Waifuku\n"
        "- `sprites/` — sprites adicionales por emoción\n",
        encoding="utf-8",
    )

def load_character(char_id: str) -> Character | None:
    """API pública para que otros módulos carguen un personaje por ID."""
    return _load_char(char_id)

def _to_response(char: Character) -> CharacterResponse:
    return CharacterResponse(**char.model_dump())


# ── CRUD base ─────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[CharacterResponse])
async def list_characters():
    return [_to_response(c) for c in _load_all()]


@router.get("/{character_id}", response_model=CharacterResponse)
async def get_character(character_id: str):
    char = _load_char(character_id)
    if not char:
        raise HTTPException(status_code=404, detail="Personaje no encontrado")
    return _to_response(char)


@router.post("/", response_model=CharacterResponse, status_code=status.HTTP_201_CREATED)
async def create_character(body: CharacterCreate):
    char = Character(**body.model_dump())
    _save_char(char)
    return _to_response(char)


@router.patch("/{character_id}", response_model=CharacterResponse)
async def update_character(character_id: str, body: CharacterUpdate):
    char = _load_char(character_id)
    if not char:
        raise HTTPException(status_code=404, detail="Personaje no encontrado")
    updated = char.model_copy(
        update={k: v for k, v in body.model_dump().items() if v is not None}
    )
    updated.updated_at = datetime.now(timezone.utc)
    _save_char(updated)
    return _to_response(updated)


@router.delete("/{character_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_character(character_id: str):
    if not _char_exists(character_id):
        raise HTTPException(status_code=404, detail="Personaje no encontrado")
    _delete_char(character_id)


@router.post("/{character_id}/toggle-favorite", response_model=CharacterResponse)
async def toggle_favorite(character_id: str):
    char = _load_char(character_id)
    if not char:
        raise HTTPException(status_code=404, detail="Personaje no encontrado")
    char.is_favorite = not char.is_favorite
    char.updated_at = datetime.now(timezone.utc)
    _save_char(char)
    return _to_response(char)


@router.get("/{character_id}/avatar")
async def get_avatar(character_id: str):
    path = _avatar_path(character_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Sin avatar")
    return FileResponse(path, media_type="image/png")


@router.post("/{character_id}/avatar", response_model=CharacterResponse)
async def upload_avatar(character_id: str, file: UploadFile = File(...)):
    char = _load_char(character_id)
    if not char:
        raise HTTPException(status_code=404, detail="Personaje no encontrado")
    data = await file.read()
    char.avatar_path = _save_avatar_bytes(char_id=character_id, data=data)
    char.updated_at = datetime.now(timezone.utc)
    _save_char(char)
    return _to_response(char)


# ── Importar desde PNG (formato SillyTavern) ──────────────────────────────────

@router.post("/import/png", response_model=CharacterResponse, status_code=status.HTTP_201_CREATED)
async def import_from_png(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".png"):
        raise HTTPException(status_code=400, detail="El archivo debe ser un PNG")
    data = await file.read()
    try:
        raw = extract_chara_from_png(data)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    version = detect_card_version(raw)
    try:
        char = (Character.from_v2(CharacterCardV2.model_validate(raw))
                if version == "v2"
                else Character.from_v1(CharacterCardV1.model_validate(raw)))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Error al parsear la card: {e}")

    char.avatar_path = _save_avatar_bytes(char.id, data)
    _save_char(char)
    return _to_response(char)


# ── Importar desde JSON (V1 o V2) ─────────────────────────────────────────────

@router.post("/import/json", response_model=CharacterResponse, status_code=status.HTTP_201_CREATED)
async def import_from_json(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".json"):
        raise HTTPException(status_code=400, detail="El archivo debe ser un JSON")
    raw = json.loads(await file.read())
    version = detect_card_version(raw)
    try:
        char = (Character.from_v2(CharacterCardV2.model_validate(raw))
                if version == "v2"
                else Character.from_v1(CharacterCardV1.model_validate(raw)))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Error al parsear la card: {e}")

    _save_char(char)
    return _to_response(char)
