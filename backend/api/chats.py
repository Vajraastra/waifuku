from fastapi import APIRouter, HTTPException, status
from datetime import datetime, timezone
from typing import Optional

from backend.core import Chat, Message, MessageRole, Bookmark
from backend.db.storage import save, load, load_all, delete, exists
from backend.api.schemas import (
    ChatCreate, BookmarkCreate, MessageUpdate,
    ChatSummary, ChatResponse, MessageResponse,
)

router = APIRouter(prefix="/chats", tags=["chats"])

ENTITY = "chats"


def _msg_to_response(m: Message) -> MessageResponse:
    return MessageResponse(
        id=m.id,
        role=m.role.value,
        content=m.get_active_content(),
        swipes=m.swipes,
        active_swipe=m.active_swipe,
        timestamp=m.timestamp,
    )


def _to_summary(chat: Chat) -> ChatSummary:
    return ChatSummary(
        id=chat.id,
        character_id=chat.character_id,
        persona_id=chat.persona_id,
        message_count=len(chat.messages),
        created_at=chat.created_at,
        updated_at=chat.updated_at,
    )


def _to_response(chat: Chat) -> ChatResponse:
    return ChatResponse(
        id=chat.id,
        character_id=chat.character_id,
        persona_id=chat.persona_id,
        messages=[_msg_to_response(m) for m in chat.messages],
        bookmarks=[b.model_dump() for b in chat.bookmarks],
        metadata=chat.metadata,
        created_at=chat.created_at,
        updated_at=chat.updated_at,
    )


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[ChatSummary])
async def list_chats(character_id: Optional[str] = None):
    chats = load_all(ENTITY, Chat)
    if character_id:
        chats = [c for c in chats if c.character_id == character_id]
    return [_to_summary(c) for c in chats]


@router.get("/{chat_id}", response_model=ChatResponse)
async def get_chat(chat_id: str):
    chat = load(ENTITY, chat_id, Chat)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat no encontrado")
    return _to_response(chat)


@router.post("/", response_model=ChatResponse, status_code=status.HTTP_201_CREATED)
async def create_chat(body: ChatCreate):
    from backend.api.characters import load_character
    chat = Chat(character_id=body.character_id, persona_id=body.persona_id)
    if body.character_id:
        char = load_character(body.character_id)
        if char and char.first_mes:
            chat.add_message(MessageRole.assistant, char.first_mes)
    save(ENTITY, chat.id, chat)
    return _to_response(chat)


@router.delete("/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat(chat_id: str):
    if not exists(ENTITY, chat_id):
        raise HTTPException(status_code=404, detail="Chat no encontrado")
    delete(ENTITY, chat_id)


# ── Mensajes ──────────────────────────────────────────────────────────────────

@router.get("/{chat_id}/messages", response_model=list[MessageResponse])
async def get_messages(chat_id: str):
    chat = load(ENTITY, chat_id, Chat)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat no encontrado")
    return [_msg_to_response(m) for m in chat.messages]


# ── Edición y eliminación de mensajes ────────────────────────────────────────

@router.patch("/{chat_id}/messages/{message_id}", response_model=MessageResponse)
async def update_message(chat_id: str, message_id: str, body: MessageUpdate):
    chat = load(ENTITY, chat_id, Chat)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat no encontrado")
    for msg in chat.messages:
        if msg.id == message_id:
            msg.content = body.content
            msg.swipes = []
            msg.active_swipe = 0
            chat.updated_at = datetime.now(timezone.utc)
            save(ENTITY, chat_id, chat)
            return _msg_to_response(msg)
    raise HTTPException(status_code=404, detail="Mensaje no encontrado")


@router.delete("/{chat_id}/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message(chat_id: str, message_id: str):
    chat = load(ENTITY, chat_id, Chat)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat no encontrado")
    original = len(chat.messages)
    chat.messages = [m for m in chat.messages if m.id != message_id]
    if len(chat.messages) == original:
        raise HTTPException(status_code=404, detail="Mensaje no encontrado")
    chat.updated_at = datetime.now(timezone.utc)
    save(ENTITY, chat_id, chat)




# ── Bookmarks ─────────────────────────────────────────────────────────────────

@router.post("/{chat_id}/bookmarks", response_model=ChatResponse, status_code=status.HTTP_201_CREATED)
async def add_bookmark(chat_id: str, body: BookmarkCreate):
    chat = load(ENTITY, chat_id, Chat)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat no encontrado")
    if body.message_index < 0 or body.message_index >= len(chat.messages):
        raise HTTPException(status_code=400, detail="Índice de mensaje fuera de rango")
    bookmark = Bookmark(label=body.label, message_index=body.message_index)
    chat.bookmarks.append(bookmark)
    chat.updated_at = datetime.now(timezone.utc)
    save(ENTITY, chat_id, chat)
    return _to_response(chat)


@router.delete("/{chat_id}/bookmarks/{bookmark_id}", response_model=ChatResponse)
async def delete_bookmark(chat_id: str, bookmark_id: str):
    chat = load(ENTITY, chat_id, Chat)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat no encontrado")
    original_len = len(chat.bookmarks)
    chat.bookmarks = [b for b in chat.bookmarks if b.id != bookmark_id]
    if len(chat.bookmarks) == original_len:
        raise HTTPException(status_code=404, detail="Bookmark no encontrado")
    chat.updated_at = datetime.now(timezone.utc)
    save(ENTITY, chat_id, chat)
    return _to_response(chat)
