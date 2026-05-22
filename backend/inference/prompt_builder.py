"""
Construye la lista de mensajes que se envía al LLM a partir de:
  - Character card (system prompt, descripción, personalidad, escenario)
  - Persona del usuario
  - Historial del chat
"""
from typing import Optional
from backend.core import Character, Persona, Chat, MessageRole
from backend.inference.providers.base import ChatMessage


def build_system_prompt(character: Character, persona: Optional[Persona]) -> str:
    parts = []

    if character.system_prompt:
        parts.append(character.system_prompt)

    char_block = []
    if character.description:
        char_block.append(f"[Descripción de {character.name}]\n{character.description}")
    if character.personality:
        char_block.append(f"[Personalidad]\n{character.personality}")
    if character.scenario:
        char_block.append(f"[Escenario]\n{character.scenario}")
    if char_block:
        parts.append("\n\n".join(char_block))

    if persona:
        user_block = f"[El usuario se llama {persona.name}]"
        if persona.description:
            user_block += f"\n{persona.description}"
        parts.append(user_block)

    return "\n\n---\n\n".join(parts)


def build_messages(
    character: Optional[Character],
    persona: Optional[Persona],
    chat: Chat,
    max_history: int = 40,
) -> list[ChatMessage]:
    messages: list[ChatMessage] = []

    if character:
        system = build_system_prompt(character, persona)
        if system:
            messages.append(ChatMessage(role="system", content=system))

        if character.mes_example:
            messages.append(ChatMessage(role="system", content=f"[Ejemplo de diálogo]\n{character.mes_example}"))

        history = chat.get_context_window(max_history)
        if not history and character.first_mes:
            messages.append(ChatMessage(role="assistant", content=character.first_mes))
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

    if character and character.post_history_instructions:
        messages.append(ChatMessage(role="system", content=character.post_history_instructions))

    return messages
