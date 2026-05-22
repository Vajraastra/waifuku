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

    @classmethod
    def from_v1(cls, card: CharacterCardV1) -> "Character":
        return cls(**card.model_dump())

    @classmethod
    def from_v2(cls, card: CharacterCardV2) -> "Character":
        return cls(**card.data.model_dump())

    def to_v2(self) -> CharacterCardV2:
        fields = self.model_dump(exclude={"id", "created_at", "updated_at", "avatar_path"})
        return CharacterCardV2(data=CharacterCardV2Data(**fields))
