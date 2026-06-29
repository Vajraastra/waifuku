"""
Construye la lista de mensajes que se envía al LLM a partir de:
  - Character card (system prompt, descripción, personalidad, escenario)
  - Persona del usuario
  - Historial del chat
  - Items activos (slots resueltos + effects inyectados)
"""
from typing import Optional, List
from backend.core import Character, Persona, Chat, MessageRole
from backend.core.item import Item
from backend.inference.providers.base import ChatMessage
from backend.inference.slot_resolver import resolve_character


def build_system_prompt(
    character: Character,
    persona: Optional[Persona],
    active_items: Optional[List[Item]] = None,
) -> str:
    resolved = resolve_character(character, active_items or [])

    parts = []

    if resolved["system_prompt"]:
        parts.append(resolved["system_prompt"])

    char_block = []
    if resolved["description"]:
        char_block.append(f"[Descripción de {character.name}]\n{resolved['description']}")
    if resolved["personality"]:
        char_block.append(f"[Personalidad]\n{resolved['personality']}")
    if resolved["scenario"]:
        char_block.append(f"[Escenario]\n{resolved['scenario']}")
    if char_block:
        parts.append("\n\n".join(char_block))

    if persona:
        user_block = f"[El usuario se llama {persona.name}]"
        if persona.description:
            user_block += f"\n{persona.description}"
        parts.append(user_block)

    return "\n\n---\n\n".join(parts)


def build_helper_system_prompt(
    character: Optional[Character],
    persona: Optional[Persona],
) -> str:
    """System prompt para modo Helper: usa la personalidad del personaje enfocada en tareas, no RP."""
    parts = []
    if character:
        block = f"Eres {character.name}."
        if character.personality:
            block += f"\n{character.personality}"
        block += (
            "\n\nTu función es asistir al usuario con tareas prácticas: búsqueda de información, "
            "análisis, respuesta a preguntas y asistencia general. "
            "Responde de forma directa y útil. No inicies roleplay ni ficción salvo que el usuario lo pida explícitamente."
        )
        parts.append(block)
    if persona:
        user_block = f"El usuario se llama {persona.name}."
        if persona.description:
            user_block += f"\n{persona.description}"
        parts.append(user_block)
    return "\n\n---\n\n".join(parts)


def build_messages(
    character: Optional[Character],
    persona: Optional[Persona],
    chat: Chat,
    max_history: int = 40,
    active_items: Optional[List[Item]] = None,
    helper_mode: bool = False,
    agent_context: str = "",
) -> list[ChatMessage]:
    messages: list[ChatMessage] = []

    # Modo Helper: prompt de tareas, sin escenario/first_mes/RP
    if helper_mode:
        system = build_helper_system_prompt(character, persona)
        if system:
            messages.append(ChatMessage(role="system", content=system))
        for msg in chat.get_context_window(max_history):
            role = "user" if msg.role == MessageRole.user else "assistant"
            messages.append(ChatMessage(role=role, content=msg.get_active_content()))
        if agent_context:
            messages.append(ChatMessage(
                role="system",
                content=f"[Resultados de herramientas agénticas]\n{agent_context.strip()}",
            ))
        return messages

    if character:
        system = build_system_prompt(character, persona, active_items)
        if system:
            messages.append(ChatMessage(role="system", content=system))

        resolved = resolve_character(character, active_items or [])
        if resolved["mes_example"]:
            messages.append(ChatMessage(role="system", content=f"[Ejemplo de diálogo]\n{resolved['mes_example']}"))

        history = chat.get_context_window(max_history)
        if not history and resolved["first_mes"]:
            messages.append(ChatMessage(role="assistant", content=resolved["first_mes"]))
            return messages
    else:
        # Modo vanilla: sin personaje, historial directo
        if persona:
            user_block = f"[El usuario se llama {persona.name}]"
            if persona.description:
                user_block += f"\n{persona.description}"
            messages.append(ChatMessage(role="system", content=user_block))
        history = chat.get_context_window(max_history)

    for msg in chat.get_context_window(max_history) if not character else history:
        role = "user" if msg.role == MessageRole.user else "assistant"
        messages.append(ChatMessage(role=role, content=msg.get_active_content()))

    if character:
        resolved = resolve_character(character, active_items or [])
        if resolved["post_history"]:
            messages.append(ChatMessage(role="system", content=resolved["post_history"]))

    return messages
