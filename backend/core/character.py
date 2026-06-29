from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid


# ── ST V1 ────────────────────────────────────────────────────────────────────

class CharacterCardV1(BaseModel):
    name: str
    description: str = ""
    personality: str = ""
    scenario: str = ""
    first_mes: str = ""
    mes_example: str = ""
    tags: List[str] = []


# ── ST V2 ────────────────────────────────────────────────────────────────────

class CharacterCardV2Data(BaseModel):
    name: str
    description: str = ""
    personality: str = ""
    scenario: str = ""
    first_mes: str = ""
    mes_example: str = ""
    creator_notes: str = ""
    system_prompt: str = ""
    post_history_instructions: str = ""
    alternate_greetings: List[str] = []
    tags: List[str] = []
    creator: str = ""
    character_version: str = ""
    extensions: Dict[str, Any] = {}


class CharacterCardV2(BaseModel):
    spec: str = "chara_card_v2"
    spec_version: str = "2.0"
    data: CharacterCardV2Data


# ── Modelo interno de Ruby ────────────────────────────────────────────────────

class Character(BaseModel):
    """Representación interna unificada. Compatible con V1 y V2 de ST."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    avatar_path: Optional[str] = None

    is_favorite: bool = False

    # Campos compartidos V1 + V2
    name: str
    description: str = ""
    personality: str = ""
    scenario: str = ""
    first_mes: str = ""
    mes_example: str = ""
    tags: List[str] = []

    # Campos exclusivos V2
    creator_notes: str = ""
    system_prompt: str = ""
    post_history_instructions: str = ""
    alternate_greetings: List[str] = []
    creator: str = ""
    character_version: str = ""
    extensions: Dict[str, Any] = {}

    # Extensión propia de Waifuku (opt-in): recordatorio breve re-inyectado a
    # profundidad fija en chats largos. No forma parte del spec ST V2; en
    # import/export viaja dentro de extensions["waifuku"] (ver from_v2/to_v2).
    character_reminder: str = ""

    @classmethod
    def from_v1(cls, card: CharacterCardV1) -> "Character":
        return cls(**card.model_dump())

    @classmethod
    def from_v2(cls, card: CharacterCardV2) -> "Character":
        data = card.data.model_dump()
        waifuku_ext = (data.get("extensions") or {}).get("waifuku", {})
        reminder = waifuku_ext.get("character_reminder", "") if isinstance(waifuku_ext, dict) else ""
        return cls(character_reminder=reminder, **data)

    def to_v2(self) -> CharacterCardV2:
        fields = self.model_dump(exclude={"id", "created_at", "updated_at", "avatar_path",
                                          "character_reminder"})
        # Persistir el recordatorio en el bolsillo sancionado del spec, sin tocar campos V2.
        if self.character_reminder:
            ext = dict(fields.get("extensions") or {})
            waifuku = dict(ext.get("waifuku") or {})
            waifuku["character_reminder"] = self.character_reminder
            ext["waifuku"] = waifuku
            fields["extensions"] = ext
        return CharacterCardV2(data=CharacterCardV2Data(**fields))
