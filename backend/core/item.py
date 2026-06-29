from pydantic import BaseModel, Field
from typing import List
from datetime import datetime, timezone
import uuid


class ItemEffect(BaseModel):
    # Targets de append: "system" | "personality" | "scenario" | "post_history"
    # Targets de campo completo: "field:description" | "field:personality" |
    #   "field:scenario" | "field:mes_example" | "field:first_mes" |
    #   "field:system_prompt" | "field:post_history_instructions"
    target: str
    content: str


class Item(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    name: str
    icon: str = "◈"         # emoji libre elegido por el usuario
    type: str               # nombre del slot que resuelve — ej. "Hat", "Mood"
    value: str = ""         # texto que reemplaza {{Type:default}} cuando está activo
    effects: List[ItemEffect] = []
    keywords: List[str] = []
    priority: int = 10
