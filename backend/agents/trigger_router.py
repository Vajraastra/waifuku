"""
Mapea un mensaje de usuario a herramientas activas por coincidencia de substring normalizado.
No requiere NLP — funciona con cualquier modelo.
"""
import re
import unicodedata

from backend.agents.registry import get_all_tools


def _normalize(text: str) -> str:
    """Lowercase + eliminar acentos + colapsar espacios."""
    nfkd = unicodedata.normalize("NFKD", text.lower())
    ascii_text = nfkd.encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", ascii_text).strip()


def match(
    message:      str,
    active_tools: list[str],
    user_config:  dict = {},
) -> list[str]:
    """
    Retorna lista de tool names que matchean el mensaje.

    active_tools — IDs de las herramientas que el usuario tiene activadas.
    user_config  — config del agente (puede contener triggers personalizados).
    """
    norm    = _normalize(message)
    all_tools = get_all_tools()
    matched: list[str] = []

    for tool_name in active_tools:
        tool = all_tools.get(tool_name)
        if not tool:
            continue
        triggers = tool.get_triggers(user_config)
        for trigger in triggers:
            if _normalize(trigger) in norm:
                matched.append(tool_name)
                break   # basta con un trigger por tool

    return matched
