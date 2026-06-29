"""
Provider compatible con la API de OpenAI.
Funciona con: OpenAI, LM Studio, TabbyAPI, vLLM, koboldcpp, etc.
"""
import json
import httpx
from typing import AsyncIterator
from .base import BaseProvider, ProviderConfig, ChatMessage

DEFAULT_BASE_URL = "https://api.openai.com/v1"


class OpenAICompatProvider(BaseProvider):
    async def stream(self, messages: list[ChatMessage]) -> AsyncIterator[str]:
        host     = (self.config.base_url or DEFAULT_BASE_URL).rstrip("/")
        api_base = (self.config.api_base or "/v1").rstrip("/")
        headers  = {"Content-Type": "application/json"}
        if self.config.api_key:
            headers["Authorization"] = f"Bearer {self.config.api_key}"

        payload = {
            "model": self.config.model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "stream": True,
            # Pide el chunk final con usage real (LM Studio/OpenAI lo soportan; otros lo ignoran)
            "stream_options": {"include_usage": True},
            "temperature": self.config.temperature,
            "top_p": self.config.top_p,
            "max_tokens": self.config.max_tokens,
        }
        # Extras no-estándar: LM Studio / koboldcpp los aceptan; solo se envían cuando
        # difieren del default para no romper servers OpenAI estrictos que rechazan params desconocidos.
        if self.config.top_k > 0:
            payload["top_k"] = self.config.top_k
        if self.config.repeat_penalty != 1.0:
            payload["repeat_penalty"] = self.config.repeat_penalty

        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream(
                "POST", f"{host}{api_base}/chat/completions",
                headers=headers, json=payload
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    raw = line[5:].strip()
                    if raw == "[DONE]":
                        break
                    try:
                        data = json.loads(raw)
                    except json.JSONDecodeError:
                        continue

                    # El chunk final (con include_usage) trae usage y choices vacío
                    usage = data.get("usage")
                    if usage:
                        self.last_usage = {
                            "prompt_tokens":     usage.get("prompt_tokens", 0),
                            "completion_tokens": usage.get("completion_tokens", 0),
                            "total_tokens":      usage.get("total_tokens", 0),
                        }

                    choices = data.get("choices") or []
                    if choices:
                        token = choices[0].get("delta", {}).get("content", "")
                        if token:
                            yield token
