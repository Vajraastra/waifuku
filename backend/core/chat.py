from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


class MessageRole(str, Enum):
    user = "user"
    assistant = "assistant"
    system = "system"


class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    role: MessageRole
    content: str
    # Respuestas alternativas generadas con swipe
    swipes: List[str] = []
    active_swipe: int = 0

    def get_active_content(self) -> str:
        if self.swipes and 0 <= self.active_swipe < len(self.swipes):
            return self.swipes[self.active_swipe]
        return self.content


class Bookmark(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    label: str
    message_index: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Chat(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    character_id: Optional[str] = None
    persona_id: Optional[str] = None

    messages: List[Message] = []
    bookmarks: List[Bookmark] = []

    # Metadatos libres para extensiones futuras (stats de juego, flags, etc.)
    metadata: Dict[str, Any] = {}

    def add_message(self, role: MessageRole, content: str) -> Message:
        msg = Message(role=role, content=content)
        self.messages.append(msg)
        self.updated_at = datetime.now(timezone.utc)
        return msg

    def get_context_window(self, max_messages: int = 40) -> List[Message]:
        """Retorna los últimos N mensajes para construir el contexto del prompt."""
        return self.messages[-max_messages:]
