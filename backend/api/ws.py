"""
WebSocket endpoint para streaming de inferencia LLM en tiempo real.

Protocolo cliente → servidor:
  {"type": "generate", "chat_id": "...", "content": "...", "config": {...}}
  {"type": "ping"}

Protocolo servidor → cliente:
  {"type": "user_message",  "message_id": "...", "content": "..."}
  {"type": "token",         "content": "..."}
  {"type": "done",          "message_id": "...", "full_content": "..."}
  {"type": "error",         "message": "..."}
  {"type": "pong"}
"""
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.core import Chat, MessageRole
from backend.core.persona import Persona
from backend.db.storage import load, save
from backend.inference.prompt_builder import build_messages
from backend.inference.providers import get_provider, ProviderConfig
from backend.inference.providers.base import THINKING_PREFIX

router = APIRouter(tags=["websocket"])


async def _send(ws: WebSocket, payload: dict):
    await ws.send_text(json.dumps(payload, ensure_ascii=False))


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
    # Cargar chat
    chat = load("chats", chat_id, Chat)
    if not chat:
        await _send(ws, {"type": "error", "message": f"Chat '{chat_id}' no encontrado"})
        return

    # Cargar character (opcional — None en modo vanilla)
    from backend.api.characters import load_character
    character = None
    if chat.character_id:
        character = load_character(chat.character_id)
        if not character:
            await _send(ws, {"type": "error", "message": "Personaje del chat no encontrado"})
            return

    # Cargar persona (opcional)
    persona = None
    if chat.persona_id:
        persona = load("personas", chat.persona_id, Persona)

    # Guardar mensaje del usuario
    user_content = msg.get("content", "").strip()
    if not user_content:
        await _send(ws, {"type": "error", "message": "El mensaje no puede estar vacío"})
        return

    user_msg = chat.add_message(MessageRole.user, user_content)
    await _send(ws, {"type": "user_message", "message_id": user_msg.id, "content": user_content})

    # Construir prompt
    messages = build_messages(character, persona, chat)

    # Configurar provider
    config_raw = msg.get("config", {})
    try:
        config = ProviderConfig(
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
        provider = get_provider(config)
    except ValueError as e:
        await _send(ws, {"type": "error", "message": str(e)})
        return

    # Streaming — thinking tokens van como think_token, respuesta real como token
    full_response = ""
    in_think = False
    try:
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
    except Exception as e:
        await _send(ws, {"type": "error", "message": f"Error de inferencia: {e}"})
        return

    # Guardar respuesta del asistente
    assistant_msg = chat.add_message(MessageRole.assistant, full_response)
    save("chats", chat_id, chat)

    await _send(ws, {
        "type": "done",
        "message_id": assistant_msg.id,
        "full_content": full_response,
    })


async def _handle_regenerate(ws: WebSocket, chat_id: str, msg: dict):
    """Regenera la última respuesta del asistente sin guardar un nuevo mensaje de usuario."""
    chat = load("chats", chat_id, Chat)
    if not chat:
        await _send(ws, {"type": "error", "message": f"Chat '{chat_id}' no encontrado"})
        return

    # Encontrar el último mensaje de usuario como contenido de contexto
    last_user = next((m for m in reversed(chat.messages) if m.role == MessageRole.user), None)
    if not last_user:
        await _send(ws, {"type": "error", "message": "No hay mensaje de usuario para regenerar"})
        return

    from backend.api.characters import load_character
    character = None
    if chat.character_id:
        character = load_character(chat.character_id)
        if not character:
            await _send(ws, {"type": "error", "message": "Personaje del chat no encontrado"})
            return

    persona = None
    if chat.persona_id:
        from backend.core.persona import Persona
        persona = load("personas", chat.persona_id, Persona)

    messages = build_messages(character, persona, chat)

    config_raw = msg.get("config", {})
    try:
        config = ProviderConfig(
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
        provider = get_provider(config)
    except ValueError as e:
        await _send(ws, {"type": "error", "message": str(e)})
        return

    full_response = ""
    in_think = False
    try:
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
    except Exception as e:
        await _send(ws, {"type": "error", "message": f"Error de inferencia: {e}"})
        return

    assistant_msg = chat.add_message(MessageRole.assistant, full_response)
    save("chats", chat_id, chat)

    await _send(ws, {
        "type": "done",
        "message_id": assistant_msg.id,
        "full_content": full_response,
    })
