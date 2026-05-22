from .base import BaseProvider, ProviderConfig, ChatMessage
from .ollama import OllamaProvider
from .openai_compat import OpenAICompatProvider


def get_provider(config: ProviderConfig) -> BaseProvider:
    providers = {
        "ollama": OllamaProvider,
        "openai": OpenAICompatProvider,
        "openai_compat": OpenAICompatProvider,
    }
    cls = providers.get(config.provider)
    if not cls:
        raise ValueError(f"Provider desconocido: '{config.provider}'. Disponibles: {list(providers)}")
    return cls(config)
