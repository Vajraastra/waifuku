"""
WebSocket endpoint para streaming de inferencia LLM en tiempo real.

Protocolo cliente → servidor:
  {"type": "generate", "chat_id": "...", "content": "...", "config": {...}}
  {"type": "regenerate", "chat_id": "...", "config": {...}}
  {"type": "ping"}

Protocolo servidor → cliente:
  {"type": "user_message",  "message_id": "...", "content": "..."}
  {"type": "token",         "content": "..."}
  {"type": "done",          "message_id": "...", "full_content": "..."}
  {"type": "error",         "message": "..."}
  {"type": "pong"}
"""
import json
import logging
import httpx
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.core import Chat, MessageRole, Item
from backend.core.persona import Persona
from backend.db.storage import load, load_all, save
from backend.inference.prompt_builder import build_messages
from backend.inference.providers import get_provider, ProviderConfig
from backend.inference.providers.base import THINKING_PREFIX

router = APIRouter(tags=["websocket"])
logger = logging.getLogger("waifuku.inference")

# Ventana de contexto por defecto cuando no se puede autodetectar ni hay valor manual.
DEFAULT_CONTEXT_BUDGET = 4096


async def _send(ws: WebSocket, payload: dict):
    await ws.send_text(json.dumps(payload, ensure_ascii=False))


class _ContextError(Exception):
    """Error de carga de contexto con mensaje listo para enviar al cliente."""


def _load_context(chat_id: str):
    """Carga (chat, character, persona, active_items). Lanza _ContextError si algo falta."""
    chat = load("chats", chat_id, Chat)
    if not chat:
        raise _ContextError(f"Chat '{chat_id}' no encontrado")

    # Character es opcional (None en modo vanilla)
    character = None
    if chat.character_id:
        from backend.api.characters import load_character
        character = load_character(chat.character_id)
        if not character:
            raise _ContextError("Personaje del chat no encontrado")

    # Persona opcional
    persona = None
    if chat.persona_id:
        persona = load("personas", chat.persona_id, Persona)

    # Items activos del chat
    active_items = []
    if chat.active_item_ids:
        all_items = {i.id: i for i in load_all("items", Item)}
        active_items = [all_items[iid] for iid in chat.active_item_ids if iid in all_items]

    return chat, character, persona, active_items


def _parse_config(config_raw: dict) -> ProviderConfig:
    """Construye un ProviderConfig desde el dict crudo del WS. Puede lanzar ValueError."""
    return ProviderConfig(
        provider=      config_raw.get("provider", "ollama"),
        model=         config_raw.get("model", "llama3.2"),
        base_url=      config_raw.get("base_url", ""),
        api_key=       config_raw.get("api_key", ""),
        api_base=      config_raw.get("api_base", "/v1"),
        temperature=   float(config_raw.get("temperature", 0.8)),
        max_tokens=    int(config_raw.get("max_tokens", 1024)),
        top_p=         float(config_raw.get("top_p", 0.9)),
        top_k=         int(config_raw.get("top_k", -1)),
        repeat_penalty=float(config_raw.get("repeat_penalty", 1.0)),
        thinking=      bool(config_raw.get("thinking", False)),
        num_ctx=       int(config_raw.get("num_ctx", 0)),
    )


async def _detect_lmstudio_context(base_url: str, model: str) -> int:
    """Autodetecta la ventana de contexto del modelo cargado en LM Studio.

    Usa la API nativa `GET {base_url}/api/v0/models`. Prefiere `loaded_context_length`
    (la ventana realmente cargada) sobre `max_context_length`. Devuelve 0 si no se puede
    determinar (server caído, endpoint ausente, ningún modelo cargado).
    """
    if not base_url:
        return 0
    url = base_url.rstrip("/") + "/api/v0/models"
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            payload = resp.json()
    except Exception:
        return 0

    items = payload.get("data", []) if isinstance(payload, dict) else payload
    loaded = [m for m in items if isinstance(m, dict) and m.get("state") == "loaded"]
    if not loaded:
        return 0
    chosen = next((m for m in loaded if m.get("id") == model), loaded[0])
    return int(chosen.get("loaded_context_length") or chosen.get("max_context_length") or 0)


async def _resolve_context_budget(config: ProviderConfig) -> int:
    """Resuelve la ventana de contexto (tokens) a usar como presupuesto.

    LM Studio (openai_compat): autodetecta; cae al valor manual y luego al default.
    Ollama/otros: valor manual del usuario o default.
    """
    manual = config.num_ctx if config.num_ctx > 0 else 0
    if config.provider == "openai_compat":
        detected = await _detect_lmstudio_context(config.base_url, config.model)
        if detected > 0:
            return detected
    if manual > 0:
        return manual
    return DEFAULT_CONTEXT_BUDGET


async def _stream_to_ws(ws: WebSocket, provider, messages) -> str:
    """Reenvía el stream del provider al WS aplicando el protocolo thinking.

    Devuelve el contenido real acumulado (sin los bloques de thinking).
    """
    full_response = ""
    in_think = False
    async for token in provider.stream(messages):
        if token == THINKING_PREFIX:
            if not in_think:
                in_think = True
                await _send(ws, {"type": "think_start"})
            else:
                in_think = False
                await _send(ws, {"type": "think_end"})
        elif in_think:
            await _send(ws, {"type": "think_token", "content": token})
        else:
            full_response += token
            await _send(ws, {"type": "token", "content": token})
    return full_response


@router.websocket("/ws/chat/{chat_id}")
async def chat_ws(ws: WebSocket, chat_id: str):
    await ws.accept()

    try:
        while True:
            raw = await ws.receive_text()
            msg = json.loads(raw)

            if msg.get("type") == "ping":
                await _send(ws, {"type": "pong"})
                continue

            if msg.get("type") == "regenerate":
                await _handle_regenerate(ws, chat_id, msg)
                continue

            if msg.get("type") != "generate":
                await _send(ws, {"type": "error", "message": "Tipo de mensaje desconocido"})
                continue

            await _handle_generate(ws, chat_id, msg)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await _send(ws, {"type": "error", "message": str(e)})
        except Exception:
            pass


async def _handle_generate(ws: WebSocket, chat_id: str, msg: dict):
    try:
        chat, character, persona, active_items = _load_context(chat_id)
    except _ContextError as e:
        await _send(ws, {"type": "error", "message": str(e)})
        return

    user_content = msg.get("content", "").strip()
    if not user_content:
        await _send(ws, {"type": "error", "message": "El mensaje no puede estar vacío"})
        return

    config_raw   = msg.get("config", {})
    helper_mode  = bool(config_raw.get("helper_mode", False))
    active_tools = config_raw.get("active_tools", [])   # lista de tool IDs activos

    # Guardar el mensaje del usuario y persistir de inmediato: si la inferencia
    # falla después, el mensaje no se pierde al recargar el chat.
    user_msg = chat.add_message(MessageRole.user, user_content)
    save("chats", chat_id, chat)
    await _send(ws, {"type": "user_message", "message_id": user_msg.id, "content": user_content})

    # Interceptor agéntico: detecta triggers y corre las herramientas antes del LLM
    agent_context = ""
    if helper_mode and active_tools:
        from backend.agents import trigger_router, executor
        matched = trigger_router.match(user_content, active_tools)
        for tool_name in matched:
            tool_params = config_raw.get("tool_params", {}).get(tool_name, {})

            async def _ws_send(payload: dict):
                await _send(ws, payload)

            result = await executor.run(tool_name, user_content, tool_params, _ws_send)
            if result and result.summary:
                agent_context += f"\n\n{result.summary}"

    try:
        config = _parse_config(config_raw)
    except ValueError as e:
        await _send(ws, {"type": "error", "message": str(e)})
        return

    # Presupuesto de contexto provider-agnóstico
    budget = await _resolve_context_budget(config)
    if config.provider == "ollama":
        config.num_ctx = budget  # Ollama aloja exactamente esta ventana

    # Construir prompt (items activos, slots resueltos, contexto agéntico + recorte por presupuesto)
    stats: dict = {}
    messages = build_messages(
        character, persona, chat,
        active_items=active_items,
        helper_mode=helper_mode,
        agent_context=agent_context,
        context_budget=budget,
        max_tokens=config.max_tokens,
        stats=stats,
    )
    _log_inference("generate", config, stats)

    try:
        provider = get_provider(config)
    except ValueError as e:
        await _send(ws, {"type": "error", "message": str(e)})
        return

    try:
        full_response = await _stream_to_ws(ws, provider, messages)
    except Exception as e:
        await _send(ws, {"type": "error", "message": f"Error de inferencia: {e}"})
        return

    assistant_msg = chat.add_message(MessageRole.assistant, full_response)
    save("chats", chat_id, chat)

    await _send(ws, {
        "type": "done",
        "message_id": assistant_msg.id,
        "full_content": full_response,
        "usage": _build_usage(provider, stats),
    })


def _build_usage(provider, stats: dict) -> dict:
    """Combina el usage real del provider (si lo reportó) con el presupuesto estimado.

    El HUD usa `prompt_tokens` real cuando existe; si no, cae a `estimated_prompt`.
    """
    real = provider.last_usage or {}
    return {
        "prompt_tokens":     real.get("prompt_tokens"),
        "completion_tokens": real.get("completion_tokens"),
        "total_tokens":      real.get("total_tokens"),
        "estimated_prompt":  stats.get("estimated_total", 0),
        "context_budget":    stats.get("context_budget", 0),
        "effective_budget":  stats.get("effective_budget", 0),
        "is_real":           bool(real),
    }


def _log_inference(kind: str, config: ProviderConfig, stats: dict):
    logger.info(
        "[%s] provider=%s model=%s budget=%d effective=%d est_tokens=%d msgs=%d recortados=%d",
        kind, config.provider, config.model,
        stats.get("context_budget", 0), stats.get("effective_budget", 0),
        stats.get("estimated_total", 0), stats.get("messages_sent", 0),
        stats.get("messages_dropped", 0),
    )


async def _handle_regenerate(ws: WebSocket, chat_id: str, msg: dict):
    """Regenera la última respuesta del asistente sin guardar un nuevo mensaje de usuario."""
    try:
        chat, character, persona, active_items = _load_context(chat_id)
    except _ContextError as e:
        await _send(ws, {"type": "error", "message": str(e)})
        return

    # Debe existir al menos un mensaje de usuario para regenerar
    last_user = next((m for m in reversed(chat.messages) if m.role == MessageRole.user), None)
    if not last_user:
        await _send(ws, {"type": "error", "message": "No hay mensaje de usuario para regenerar"})
        return

    config_raw  = msg.get("config", {})
    helper_mode = bool(config_raw.get("helper_mode", False))

    try:
        config = _parse_config(config_raw)
    except ValueError as e:
        await _send(ws, {"type": "error", "message": str(e)})
        return

    budget = await _resolve_context_budget(config)
    if config.provider == "ollama":
        config.num_ctx = budget

    stats: dict = {}
    messages = build_messages(
        character, persona, chat,
        active_items=active_items,
        helper_mode=helper_mode,
        context_budget=budget,
        max_tokens=config.max_tokens,
        stats=stats,
    )
    _log_inference("regenerate", config, stats)

    try:
        provider = get_provider(config)
    except ValueError as e:
        await _send(ws, {"type": "error", "message": str(e)})
        return

    try:
        full_response = await _stream_to_ws(ws, provider, messages)
    except Exception as e:
        await _send(ws, {"type": "error", "message": f"Error de inferencia: {e}"})
        return

    assistant_msg = chat.add_message(MessageRole.assistant, full_response)
    save("chats", chat_id, chat)

    await _send(ws, {
        "type": "done",
        "message_id": assistant_msg.id,
        "full_content": full_response,
        "usage": _build_usage(provider, stats),
    })
