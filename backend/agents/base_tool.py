"""
Contrato base para todas las herramientas agénticas de Waifuku.
Toda herramienta hereda BaseTool y declara sus metadatos.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, AsyncIterator, List


class ResultType(str, Enum):
    TEXT       = "text"
    LINK_LIST  = "link_list"
    IMAGE_LIST = "image_list"
    FILE       = "file"
    ERROR      = "error"


@dataclass
class ToolResult:
    type:     ResultType
    data:     Any
    summary:  str  = ""
    metadata: dict = field(default_factory=dict)


@dataclass
class AgentStep:
    """Paso intermedio del agente — se streama por WS en tiempo real."""
    tool:           str
    action:         str
    status:         str   # "running" | "done" | "error"
    result_preview: str = ""


class BaseTool(ABC):
    # Declarados como atributos de clase en cada subclase
    name:             str
    label:            str
    description:      str
    default_triggers: List[str] = []
    requires_models:  List[str] = []
    category:         str = "general"

    @abstractmethod
    async def execute(
        self,
        goal:   str,
        params: dict,
    ) -> AsyncIterator[AgentStep | ToolResult]:
        """
        Generador async: emite AgentStep durante la ejecución y un ToolResult al final.
        El executor consume este generador y streama cada evento por WebSocket.
        """
        ...

    async def is_ready(self) -> tuple[bool, List[str]]:
        """Retorna (True, []) si todos los modelos requeridos están instalados."""
        from backend.models.manager import model_manager
        missing = model_manager.check_missing(self.requires_models)
        return len(missing) == 0, [m["id"] for m in missing]

    def get_triggers(self, user_config: dict) -> List[str]:
        """Triggers efectivos: override del usuario o los defaults del tool."""
        return user_config.get("triggers", {}).get(self.name, self.default_triggers)
