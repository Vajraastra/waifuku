"""
Executor del agente — corre una herramienta, streama pasos por WS y retorna el resultado final.
"""
import logging
from dataclasses import asdict
from typing import Callable, Awaitable

from backend.agents.base_tool import AgentStep, ToolResult
from backend.agents.registry import get_tool

log = logging.getLogger(__name__)

WsSend = Callable[[dict], Awaitable[None]]


async def run(
    tool_name: str,
    goal:      str,
    params:    dict,
    ws_send:   WsSend,
) -> ToolResult | None:
    """
    Ejecuta una herramienta y streama cada paso por WebSocket.

    Mensajes emitidos:
      agent_start          — herramienta iniciada
      agent_step           — paso intermedio (visible en el chat)
      agent_result         — resultado final de la herramienta
      agent_done           — ejecución completa
      agent_models_required— modelos faltantes (aborta sin ejecutar)
      agent_error          — error durante la ejecución
    """
    tool = get_tool(tool_name)
    if not tool:
        await ws_send({"type": "agent_error", "message": f"Herramienta '{tool_name}' no registrada"})
        return None

    ready, missing = await tool.is_ready()
    if not ready:
        await ws_send({"type": "agent_models_required", "models": missing, "tool": tool_name})
        return None

    await ws_send({"type": "agent_start", "tool": tool_name, "goal": goal})

    final_result: ToolResult | None = None
    try:
        async for event in tool.execute(goal, params):
            if isinstance(event, AgentStep):
                await ws_send({"type": "agent_step", **asdict(event)})
            elif isinstance(event, ToolResult):
                final_result = event

        if final_result:
            await ws_send({
                "type":        "agent_result",
                "result_type": final_result.type.value,
                "data":        final_result.data,
                "summary":     final_result.summary,
            })
            await ws_send({"type": "agent_done", "summary": final_result.summary})
        else:
            await ws_send({"type": "agent_error", "message": "La herramienta no produjo resultado", "tool": tool_name})

    except Exception as e:
        log.exception(f"Error en executor para tool '{tool_name}'")
        await ws_send({"type": "agent_error", "message": str(e), "tool": tool_name})

    return final_result
