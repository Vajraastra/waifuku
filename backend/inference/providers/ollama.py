import json
import httpx
from typing import AsyncIterator
from .base import BaseProvider, ProviderConfig, ChatMessage, THINKING_PREFIX

DEFAULT_BASE_URL = "http://localhost:11434"
DEFAULT_NUM_CTX = 4096  # ventana por defecto si no llega un presupuesto explícito


class OllamaProvider(BaseProvider):
    async def stream(self, messages: list[ChatMessage]) -> AsyncIterator[str]:
        base_url = self.config.base_url or DEFAULT_BASE_URL

        options: dict = {
            "temperature": self.config.temperature,
            "top_p":       self.config.top_p,
            "num_predict": self.config.max_tokens,
        }
        if self.config.top_k > 0:
            options["top_k"] = self.config.top_k
        if self.config.repeat_penalty != 1.0:
            options["repeat_penalty"] = self.config.repeat_penalty
        # num_ctx SIEMPRE: ws.py inyecta el presupuesto resuelto; default sensato como respaldo.
        options["num_ctx"] = self.config.num_ctx if self.config.num_ctx > 0 else DEFAULT_NUM_CTX

        payload = {
            "model":    self.config.model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "stream":   True,
            "options":  options,
        }
        if self.config.thinking:
            payload["think"] = True

        async with httpx.AsyncClient(timeout=180) as client:
            async with client.stream("POST", f"{base_url}/api/chat", json=payload) as resp:
                if resp.status_code >= 400:
                    body = await resp.aread()
                    try:
                        detail = json.loads(body).get("error", body.decode())
                    except Exception:
                        detail = body.decode()
                    raise RuntimeError(f"Ollama {resp.status_code}: {detail}")
                in_thinking = False

                async for line in resp.aiter_lines():
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                        msg = data.get("message", {})

                        # Contenido de thinking (razonamiento interno)
                        thinking_chunk = msg.get("thinking", "")
                        if thinking_chunk:
                            if not in_thinking:
                                in_thinking = True
                                yield THINKING_PREFIX  # señal de inicio
                            yield thinking_chunk

                        # Contenido real de respuesta
                        content_chunk = msg.get("content", "")
                        if content_chunk:
                            if in_thinking:
                                in_thinking = False
                                yield THINKING_PREFIX  # señal de cierre
                            yield content_chunk

                        if data.get("done"):
                            prompt_tokens = data.get("prompt_eval_count")
                            completion_tokens = data.get("eval_count")
                            if prompt_tokens is not None or completion_tokens is not None:
                                self.last_usage = {
                                    "prompt_tokens":     prompt_tokens or 0,
                                    "completion_tokens": completion_tokens or 0,
                                    "total_tokens":      (prompt_tokens or 0) + (completion_tokens or 0),
                                }
                            break
                    except json.JSONDecodeError:
                        continue
