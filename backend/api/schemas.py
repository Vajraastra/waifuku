"""Schemas de request/response para la API (capa separada de los modelos core)."""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


# ── Character ─────────────────────────────────────────────────────────────────

class CharacterCreate(BaseModel):
    name: str
    description: str = ""
    personality: str = ""
    scenario: str = ""
    first_mes: str = ""
    mes_example: str = ""
    tags: List[str] = []
    creator_notes: str = ""
    system_prompt: str = ""
    post_history_instructions: str = ""
    alternate_greetings: List[str] = []
    creator: str = ""
    character_version: str = ""


class CharacterUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    personality: Optional[str] = None
    scenario: Optional[str] = None
    first_mes: Optional[str] = None
    mes_example: Optional[str] = None
    tags: Optional[List[str]] = None
    creator_notes: Optional[str] = None
    system_prompt: Optional[str] = None
    post_history_instructions: Optional[str] = None
    alternate_greetings: Optional[List[str]] = None
    creator: Optional[str] = None
    character_version: Optional[str] = None
    is_favorite: Optional[bool] = None


class CharacterResponse(BaseModel):
    id: str
    name: str
    description: str
    personality: str
    scenario: str
    first_mes: str
    mes_example: str
    tags: List[str]
    creator_notes: str
    system_prompt: str
    post_history_instructions: str
    alternate_greetings: List[str]
    creator: str
    character_version: str
    avatar_path: Optional[str]
    is_favorite: bool
    created_at: datetime
    updated_at: datetime


# ── Persona ───────────────────────────────────────────────────────────────────

class PersonaCreate(BaseModel):
    name: str
    description: str = ""
    is_default: bool = False


class PersonaUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_default: Optional[bool] = None


class PersonaResponse(BaseModel):
    id: str
    name: str
    description: str
    is_default: bool
    avatar_path: Optional[str]
    created_at: datetime
    updated_at: datetime


# ── Chat ──────────────────────────────────────────────────────────────────────

class ChatCreate(BaseModel):
    character_id: Optional[str] = None
    persona_id: Optional[str] = None


class BookmarkCreate(BaseModel):
    label: str
    message_index: int


class MessageUpdate(BaseModel):
    content: str


class ChatSummary(BaseModel):
    id: str
    character_id: Optional[str]
    persona_id: Optional[str]
    message_count: int
    created_at: datetime
    updated_at: datetime


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    swipes: List[str]
    active_swipe: int
    timestamp: datetime


class ChatResponse(BaseModel):
    id: str
    character_id: Optional[str]
    persona_id: Optional[str]
    messages: List[MessageResponse]
    bookmarks: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
