"""
Herramienta: Búsqueda Web
Usa DuckDuckGo (sin API key) para buscar texto en internet.
"""
from typing import AsyncIterator

from backend.agents.base_tool import AgentStep, BaseTool, ResultType, ToolResult


class WebSearchTool(BaseTool):
    name        = "web_search"
    label       = "Búsqueda Web"
    description = "Busca información en internet usando DuckDuckGo y devuelve los resultados más relevantes."
    category    = "web"
    requires_models  = []
    default_triggers = [
        # Español
        "busca en internet",
        "busca en la web",
        "busca informacion sobre",
        "busca sobre",
        "que dice internet sobre",
        "que dice la web sobre",
        "investiga sobre",
        "busca noticias sobre",
        # English
        "search the web for",
        "search for",
        "look up",
        "find information about",
        "search online for",
    ]

    async def execute(
        self,
        goal:   str,
        params: dict,
    ) -> AsyncIterator[AgentStep | ToolResult]:
        max_results = int(params.get("max_results", 5))

        yield AgentStep(
            tool=self.name,
            action=f'Buscando: "{goal}"',
            status="running",
        )

        try:
            from ddgs import DDGS
        except ImportError:
            yield AgentStep(tool=self.name, action="Error: ddgs no instalado", status="error")
            yield ToolResult(
                type=ResultType.ERROR,
                data="Dependencia faltante: ddgs",
                summary="Instala la dependencia con: pip install ddgs",
            )
            return

        try:
            results = []
            with DDGS() as ddgs:
                for r in ddgs.text(goal, max_results=max_results):
                    results.append({
                        "title":   r.get("title", ""),
                        "url":     r.get("href", ""),
                        "snippet": r.get("body", ""),
                    })
        except Exception as e:
            yield AgentStep(tool=self.name, action=f"Error en búsqueda: {e}", status="error")
            yield ToolResult(type=ResultType.ERROR, data=str(e), summary="Error al consultar DuckDuckGo.")
            return

        if not results:
            yield AgentStep(tool=self.name, action="Sin resultados", status="done")
            yield ToolResult(
                type=ResultType.TEXT,
                data="No se encontraron resultados para esta búsqueda.",
                summary="Sin resultados.",
            )
            return

        yield AgentStep(
            tool=self.name,
            action=f"Encontré {len(results)} resultado{'s' if len(results) != 1 else ''}",
            status="done",
            result_preview=results[0]["title"],
        )

        # Resumen legible para que el LLM pueda sintetizar
        summary_parts = []
        for i, r in enumerate(results, 1):
            summary_parts.append(
                f"{i}. **{r['title']}**\n{r['snippet']}\nFuente: {r['url']}"
            )
        summary = "\n\n".join(summary_parts)

        yield ToolResult(
            type=ResultType.LINK_LIST,
            data=results,
            summary=summary,
        )
