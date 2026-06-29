from fastapi import APIRouter, HTTPException, status
from datetime import datetime, timezone

from backend.core import Item
from backend.db.storage import save, load, load_all, delete, exists
from backend.api.schemas import ItemCreate, ItemUpdate, ItemResponse

router = APIRouter(prefix="/items", tags=["items"])

ENTITY = "items"


def _to_response(item: Item) -> ItemResponse:
    return ItemResponse(**item.model_dump())


@router.get("/", response_model=list[ItemResponse])
async def list_items():
    return [_to_response(i) for i in load_all(ENTITY, Item)]


@router.get("/{item_id}", response_model=ItemResponse)
async def get_item(item_id: str):
    item = load(ENTITY, item_id, Item)
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    return _to_response(item)


@router.post("/", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(body: ItemCreate):
    item = Item(**body.model_dump())
    save(ENTITY, item.id, item)
    return _to_response(item)


@router.patch("/{item_id}", response_model=ItemResponse)
async def update_item(item_id: str, body: ItemUpdate):
    item = load(ENTITY, item_id, Item)
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    updated = item.model_copy(
        update={k: v for k, v in body.model_dump().items() if v is not None}
    )
    updated.updated_at = datetime.now(timezone.utc)
    save(ENTITY, item_id, updated)
    return _to_response(updated)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(item_id: str):
    if not exists(ENTITY, item_id):
        raise HTTPException(status_code=404, detail="Item no encontrado")
    delete(ENTITY, item_id)
