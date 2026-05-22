from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
import uuid


class Persona(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    name: str
    description: str = ""
    avatar_path: Optional[str] = None
    is_default: bool = False
