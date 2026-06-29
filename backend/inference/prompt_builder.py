"""
Construye la lista de mensajes que se envía al LLM a partir de:
  - Character card (system prompt, descripción, personalidad, escenario)
  - Persona del usuario
  - Historial del chat
  - Items activos (slots resueltos + effects inyectados)

Presupuesto de contexto (provider-agnóstico):
  Estimador chars/4. Los bloques fijos (system + card + items + post_history +
  contexto agéntico) se reservan SIEMPRE. Del historial se reserva el primer
  mensaje (ancla de tono) y la cola de los últimos que quepan; se recorta solo
  el medio-antiguo, nunca un FIFO ciego. Si no se pasa `context_budget` se cae
  al comportamiento legacy (últimos `max_history` mensajes).
"""
from typing import Optional, List, Tuple
from backend.core import Character, Persona, Chat, MessageRole
from backend.core.item import Item
from backend.inference.providers.base import ChatMessage
from backend.inference.slot_resolver import resolve_character

# Estimador de tokens: ~4 caracteres por token + un pequeño overhead de framing
# (role/separadores) por mensaje para no subestimar.
_CHARS_PER_TOKEN = 4
_PER_MSG_OVERHEAD = 4
_DEFAULT_MARGIN_RATIO = 0.10

# Re-inyección del personaje: profundidad fija (nº de mensajes finales que quedan
# DESPUÉS del recordatorio dentro del historial). Opt-in vía character_reminder.
REMINDER_DEPTH = 4


def estimate_tokens(text: str) -> int:
    """Estimación barata de tokens a partir de caracteres (chars/4)."""
    return len(text) // _CHARS_PER_TOKEN + 1


def _msg_tokens(content: str) -> int:
    return estimate_tokens(content) + _PER_MSG_OVERHEAD


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


def _select_history(history: List[ChatMessage], avail: int) -> Tuple[List[ChatMessage], int]:
    """Selecciona mensajes del historial respetando el presupuesto `avail` (tokens).

    Reserva el primer mensaje (ancla de tono) y la cola de los últimos que quepan;
    recorta solo del medio-antiguo. Devuelve (mensajes_seleccionados, nº_recortados).
    """
    n = len(history)
    if n == 0:
        return [], 0

    costs = [_msg_tokens(m.content) for m in history]
    if sum(costs) <= avail:
        return history, 0

    include_anchor = costs[0] <= avail
    budget_tail = avail - (costs[0] if include_anchor else 0)

    tail: List[ChatMessage] = []
    used = 0
    start = 1 if include_anchor else 0
    i = n - 1
    while i >= start:
        if used + costs[i] <= budget_tail:
            tail.append(history[i])
            used += costs[i]
            i -= 1
        else:
            break
    tail.reverse()

    result = ([history[0]] if include_anchor else []) + tail
    return result, n - len(result)


def _make_stats(
    budget: int, max_tokens: int, margin_ratio: float,
    fixed_msgs: List[ChatMessage], selected: List[ChatMessage],
    dropped: int, total_history: int,
) -> dict:
    fixed_tokens = sum(_msg_tokens(m.content) for m in fixed_msgs)
    history_tokens = sum(_msg_tokens(m.content) for m in selected)
    effective = (budget - max_tokens - int(budget * margin_ratio)) if budget > 0 else 0
    return {
        "context_budget":   budget,
        "effective_budget": effective,
        "fixed_tokens":     fixed_tokens,
        "history_tokens":   history_tokens,
        "estimated_total":  fixed_tokens + history_tokens,
        "messages_sent":    len(selected),
        "messages_dropped": dropped,
        "messages_total":   total_history,
    }


def build_messages(
    character: Optional[Character],
    persona: Optional[Persona],
    chat: Chat,
    max_history: int = 40,
    active_items: Optional[List[Item]] = None,
    helper_mode: bool = False,
    agent_context: str = "",
    *,
    context_budget: int = 0,
    max_tokens: int = 0,
    margin_ratio: float = _DEFAULT_MARGIN_RATIO,
    stats: Optional[dict] = None,
) -> list[ChatMessage]:
    # Bloques fijos antes (pre) y después (post) del historial. Se reservan siempre.
    pre: List[ChatMessage] = []
    post: List[ChatMessage] = []
    first_mes_only: Optional[ChatMessage] = None
    reminder_msg: Optional[ChatMessage] = None

    if helper_mode:
        # Modo Helper: prompt de tareas, sin escenario/first_mes/RP
        system = build_helper_system_prompt(character, persona)
        if system:
            pre.append(ChatMessage(role="system", content=system))
        if agent_context:
            post.append(ChatMessage(
                role="system",
                content=f"[Resultados de herramientas agénticas]\n{agent_context.strip()}",
            ))
    elif character:
        system = build_system_prompt(character, persona, active_items)
        if system:
            pre.append(ChatMessage(role="system", content=system))

        resolved = resolve_character(character, active_items or [])
        if resolved["mes_example"]:
            pre.append(ChatMessage(role="system", content=f"[Ejemplo de diálogo]\n{resolved['mes_example']}"))

        # Card recién abierta sin historial → solo el first_mes
        if not chat.messages and resolved["first_mes"]:
            first_mes_only = ChatMessage(role="assistant", content=resolved["first_mes"])

        # Recordatorio de personaje (opt-in): se re-inyecta a profundidad fija en el historial
        if resolved.get("character_reminder"):
            reminder_msg = ChatMessage(
                role="system",
                content=f"[Recordatorio de personaje]\n{resolved['character_reminder']}",
            )

        if resolved["post_history"]:
            post.append(ChatMessage(role="system", content=resolved["post_history"]))
    else:
        # Modo vanilla: sin personaje, historial directo
        if persona:
            user_block = f"[El usuario se llama {persona.name}]"
            if persona.description:
                user_block += f"\n{persona.description}"
            pre.append(ChatMessage(role="system", content=user_block))

    if first_mes_only is not None:
        messages = pre + [first_mes_only]
        if stats is not None:
            stats.update(_make_stats(context_budget, max_tokens, margin_ratio,
                                     pre + post, [], 0, len(chat.messages)))
        return messages

    # Historial crudo → ChatMessage (orden cronológico)
    history_all = [
        ChatMessage(
            role=("user" if m.role == MessageRole.user else "assistant"),
            content=m.get_active_content(),
        )
        for m in chat.messages
    ]

    # El recordatorio es un bloque fijo: se reserva su costo antes de seleccionar historial.
    reminder_cost = _msg_tokens(reminder_msg.content) if reminder_msg else 0

    if context_budget > 0:
        effective = context_budget - max_tokens - int(context_budget * margin_ratio)
        fixed = sum(_msg_tokens(m.content) for m in pre + post) + reminder_cost
        avail = max(0, effective - fixed)
        selected, dropped = _select_history(history_all, avail)
    else:
        # Legacy: sin presupuesto, últimos max_history
        selected = history_all[-max_history:]
        dropped = len(history_all) - len(selected)

    # Re-inyección a profundidad fija: dentro del historial, dejando REMINDER_DEPTH
    # mensajes después. Solo si hay historial (en el primer turno la card está fresca).
    history_with_reminder = selected
    if reminder_msg and selected:
        pos = max(0, len(selected) - REMINDER_DEPTH)
        history_with_reminder = selected[:pos] + [reminder_msg] + selected[pos:]

    messages = pre + history_with_reminder + post

    if stats is not None:
        fixed_for_stats = pre + post + ([reminder_msg] if (reminder_msg and selected) else [])
        stats.update(_make_stats(context_budget, max_tokens, margin_ratio,
                                 fixed_for_stats, selected, dropped, len(chat.messages)))
    return messages
