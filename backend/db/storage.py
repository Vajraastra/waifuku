"""
Persistencia simple basada en archivos JSON.
Cada entidad se guarda como un archivo individual: data/<tipo>/<id>.json
"""
import json
from pathlib import Path
from typing import Type, TypeVar, Optional, List
from pydantic import BaseModel
from datetime import datetime, timezone

T = TypeVar("T", bound=BaseModel)

DATA_ROOT = Path(__file__).parent.parent.parent / "data"


def _dir(entity_type: str) -> Path:
    d = DATA_ROOT / entity_type
    d.mkdir(parents=True, exist_ok=True)
    return d


def _serializer(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"No serializable: {type(obj)}")


def save(entity_type: str, entity_id: str, data: BaseModel) -> None:
    path = _dir(entity_type) / f"{entity_id}.json"
    path.write_text(
        json.dumps(data.model_dump(), default=_serializer, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def load(entity_type: str, entity_id: str, model: Type[T]) -> Optional[T]:
    path = _dir(entity_type) / f"{entity_id}.json"
    if not path.exists():
        return None
    return model.model_validate_json(path.read_text(encoding="utf-8"))


def load_all(entity_type: str, model: Type[T]) -> List[T]:
    results = []
    for path in sorted(_dir(entity_type).glob("*.json")):
        try:
            results.append(model.model_validate_json(path.read_text(encoding="utf-8")))
        except Exception:
            pass
    return results


def delete(entity_type: str, entity_id: str) -> bool:
    path = _dir(entity_type) / f"{entity_id}.json"
    if path.exists():
        path.unlink()
        return True
    return False


def exists(entity_type: str, entity_id: str) -> bool:
    return (_dir(entity_type) / f"{entity_id}.json").exists()
