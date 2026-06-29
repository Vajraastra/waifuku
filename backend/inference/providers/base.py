"""Interface base que deben implementar todos los providers de LLM."""
from abc import ABC, abstractmethod
from typing import AsyncIterator
from dataclasses import dataclass, field

# Marcador que separa bloques de thinking del contenido real en el stream.
# ws.py lo intercepta y lo convierte en mensajes tipados (think_start/think_end).
THINKING_PREFIX = "\x00THINK\x00"


@dataclass
class ProviderConfig:
    provider: str           # "ollama" | "openai_compat"
    model: str
    base_url: str = ""
    api_key: str = ""
    api_base: str = "/v1"        # prefijo de ruta para openai_compat (ej. "/v1" para LM Studio)
    temperature: float = 0.8
    max_tokens: int = 1024
    top_p: float = 0.9
    top_k: int = -1              # -1 = usar default del modelo
    repeat_penalty: float = 1.0  # 1.0 = sin penalización
    thinking: bool = False       # activar modo thinking/razonamiento extendido
    num_ctx: int = 0             # 0 = usar default del modelo; >0 = ventana de contexto explícita
    extra: dict = field(default_factory=dict)


@dataclass
class ChatMessage:
    role: str   # "system" | "user" | "assistant"
    content: str


class BaseProvider(ABC):
    def __init__(self, config: ProviderConfig):
        self.config = config
        # Usage real del último request, poblado al cerrar el stream si el server lo
        # reporta. Forma: {"prompt_tokens", "completion_tokens", "total_tokens"}.
        # None si el provider/server no lo expone (el caller cae a la estimación).
        self.last_usage: dict | None = None

    @abstractmethod
    async def stream(self, messages: list[ChatMessage]) -> AsyncIterator[str]:
        """Genera texto en streaming. Yield de fragmentos de texto (tokens).

        Al terminar, puede poblar `self.last_usage` con los conteos reales de tokens.
        """
        ...
