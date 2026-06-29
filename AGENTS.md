# AGENTS.md — Sistema Agéntico de Waifuku

> Documento de diseño fundacional. Define la arquitectura, contratos de interfaz,
> protocolo WS y convenciones que toda herramienta agéntica debe seguir.
> Actualizar este documento cuando se añadan nuevas herramientas.

---

## 1. Visión

El chat vanilla de Waifuku evoluciona hacia un **agente local con herramientas**:
el usuario escribe en lenguaje natural, el sistema detecta el intent, ejecuta
las herramientas necesarias (búsqueda web, visión, descarga, etc.) y devuelve
resultados enriquecidos directamente en el chat — todo localmente, sin APIs de pago.

### Principios

- **Autocontenido**: los modelos ML se descargan y gestionan dentro del proyecto.
- **Extensible**: añadir una herramienta nueva = crear un directorio + heredar `BaseTool`. Cero cambios al core.
- **Funciona con cualquier LLM**: el agente no requiere tool-calling nativo del modelo. El LLM se usa para planning y síntesis, no para parsear JSON de herramientas.
- **Transparente**: el usuario ve cada paso del agente en tiempo real por WebSocket.
- **Configurable**: los triggers y parámetros de cada herramienta son configurables por el usuario.

---

## 2. Estructura de directorios

```
backend/
  agent/
    __init__.py
    base_tool.py          ← BaseTool ABC + tipos de resultado
    registry.py           ← auto-descubre y registra herramientas
    executor.py           ← loop ReAct (Reason → Act → Observe)
    planner.py            ← parsea goal, selecciona herramientas
    trigger_router.py     ← mapea mensaje → herramienta(s)
    tools/
      web_search/         ← Herramienta 1
        __init__.py
        tool.py
        engine.py
      image_search/       ← Herramienta 2
        __init__.py
        tool.py
        sources/
          danbooru.py
          bing_images.py
      url_reader/         ← Herramienta 3
        __init__.py
        tool.py
      vision_filter/      ← Módulo transversal (no es herramienta directa)
        __init__.py
        recognition_engine.py
        clip_scorer.py
        image_filter.py
  models/
    __init__.py
    manager.py            ← descarga, verifica, sirve modelos ML
    registry.py           ← catálogo de modelos con URLs y checksums
  api/
    agent.py              ← endpoints REST + WS del agente

data/
  models/                 ← todos los modelos ML van aquí
    onnx/
      face_detection_yunet_2023mar.onnx
      lbpcascade_animeface.xml
      w600k_r50.onnx
    clip/
      (open_clip gestiona internamente)
  downloads/              ← resultados del agente (imágenes, archivos)
    {session_id}/
      {query_slug}/

frontend/src/
  agent/
    useAgent.js           ← hook WS del agente
    AgentStepLog.jsx      ← log de pasos en tiempo real
    results/
      ImageGrid.jsx       ← resultado tipo imagen
      LinkList.jsx        ← resultado tipo lista de links
      TextResult.jsx      ← resultado tipo texto enriquecido
  scenes/
    VanillaChat.jsx       ← integra el agente al chat existente
```

---

## 3. Contrato BaseTool

Toda herramienta hereda de `BaseTool` y declara sus metadatos:

```python
# backend/agent/base_tool.py

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, List, Optional
from enum import Enum


class ResultType(str, Enum):
    TEXT       = "text"        # markdown
    IMAGE_LIST = "image_list"  # lista de imágenes descargadas o URLs
    LINK_LIST  = "link_list"   # lista de URLs con título y descripción
    FILE       = "file"        # archivo descargado
    ERROR      = "error"


@dataclass
class ToolResult:
    type:      ResultType
    data:      Any                    # payload según el tipo
    summary:   str = ""               # resumen legible para el LLM
    metadata:  dict = field(default_factory=dict)


@dataclass
class AgentStep:
    """Un paso del loop ReAct — se streama por WS."""
    tool:        str
    action:      str    # descripción humana de lo que está haciendo
    status:      str    # "running" | "done" | "error"
    result_preview: str = ""


class BaseTool(ABC):
    # ── Metadatos declarativos ────────────────────────────────────────────────
    name: str                          # identificador único snake_case
    label: str                         # nombre amigable para la UI
    description: str                   # descripción para el LLM planner
    default_triggers: List[str] = []   # frases que activan esta herramienta
    requires_models:  List[str] = []   # IDs en ModelRegistry
    category: str = "general"          # para agrupar en settings UI

    # ── Métodos que toda herramienta debe implementar ─────────────────────────

    @abstractmethod
    async def execute(
        self,
        goal:   str,
        params: dict,
    ) -> AsyncIterator[AgentStep | ToolResult]:
        """
        Generador async que emite AgentStep (pasos intermedios visibles al usuario)
        y un ToolResult final.

        Ejemplo:
            yield AgentStep(tool=self.name, action="Buscando en DuckDuckGo...", status="running")
            results = await self._search(goal)
            yield AgentStep(tool=self.name, action=f"Encontré {len(results)} resultados", status="done")
            yield ToolResult(type=ResultType.LINK_LIST, data=results, summary=...)
        """
        ...

    # ── Métodos con implementación default ───────────────────────────────────

    async def is_ready(self) -> tuple[bool, List[str]]:
        """Verifica que los modelos requeridos estén disponibles."""
        from backend.models.manager import model_manager
        missing = await model_manager.check_missing(self.requires_models)
        return len(missing) == 0, missing

    def get_triggers(self, user_config: dict) -> List[str]:
        """Triggers efectivos = user_config override OR defaults."""
        return user_config.get("triggers", {}).get(self.name, self.default_triggers)
```

---

## 4. Sistema de Triggers

Los triggers son **frases configuradas por el usuario** que activan herramientas.
No requieren NLP — es coincidencia de substring normalizado.

### Normalización
```python
import unicodedata, re

def normalize(text: str) -> str:
    # lowercase + eliminar acentos + colapsar espacios
    nfkd = unicodedata.normalize("NFKD", text.lower())
    ascii_text = nfkd.encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", ascii_text).strip()
```

### Algoritmo de matching
```
mensaje_usuario normalizado
    ↓
¿contiene algún trigger de herramienta A? → activar A
¿contiene algún trigger de herramienta B? → activar B
    ↓ (sin match)
LLM classifier (opcional): "¿qué herramienta usar aquí?"
    ↓ (sin match)
Flow normal: prompt → LLM → respuesta
```

### Configuración por defecto de triggers

| Herramienta     | Triggers por defecto (ES)                                         |
|-----------------|-------------------------------------------------------------------|
| `web_search`    | "busca en internet", "busca en la web", "qué dice internet sobre" |
| `image_search`  | "busca imágenes de", "encuentra imágenes de", "muéstrame fotos de", "descarga imágenes de" |
| `url_reader`    | "lee esta página", "resume este artículo", "lee este link"        |

El usuario puede añadir/quitar frases desde Settings → Agente → Triggers.

### Prioridad
1. Triggers del usuario (mayor prioridad)
2. Triggers por defecto de la herramienta
3. URL detectada automáticamente en el mensaje → activa `url_reader`

---

## 5. Loop ReAct (Executor)

El agente sigue el patrón **Reason → Act → Observe** con máximo de pasos configurable.

```
goal: "busca imágenes de Tohru de Dragon Maid, solo las que sea claramente ella"

STEP 1 — PLAN
  LLM extrae: {personaje: "Tohru", obra: "Dragon Maid", filtro: "verificado por visión"}
  Herramientas seleccionadas: [image_search, vision_filter]

STEP 2 — ACT: image_search
  → WebSearchTool busca candidatos
  → Emite AgentStep: "Buscando en Danbooru/Safebooru..."
  → Emite AgentStep: "Encontré 180 URLs candidatas"

STEP 3 — ACT: image_fetch
  → Descarga paralela a /tmp/agent_cache/
  → Emite AgentStep: "Descargando 180 imágenes..."

STEP 4 — ACT: vision_filter
  → CLIP scorer + ArcFace (si hay perfil)
  → Emite AgentStep: "Filtrando con visión... 67/180 verificadas"

STEP 5 — OBSERVE
  ¿Suficientes resultados? Sí → terminar
  ¿No? → replanning (buscar en más fuentes)

STEP 6 — SYNTHESIZE
  LLM genera resumen: "Encontré 67 imágenes verificadas de Tohru de 3 fuentes"
  Emite ToolResult: {type: IMAGE_LIST, data: [...paths...]}
```

```python
# backend/agent/executor.py (pseudocódigo)

async def run(goal: str, tool: BaseTool, params: dict, ws_send) -> ToolResult:
    ready, missing = await tool.is_ready()
    if not ready:
        await ws_send({"type": "agent_models_required", "models": missing})
        return

    await ws_send({"type": "agent_start", "tool": tool.name, "goal": goal})

    final_result = None
    async for event in tool.execute(goal, params):
        if isinstance(event, AgentStep):
            await ws_send({"type": "agent_step", **asdict(event)})
        elif isinstance(event, ToolResult):
            final_result = event

    await ws_send({"type": "agent_done", "result": serialize(final_result)})
    return final_result
```

---

## 6. Protocolo WebSocket — Extensión para el Agente

Los mensajes existentes del chat no cambian. Se añaden nuevos tipos:

### Cliente → Servidor
```jsonc
// Activar herramienta explícitamente (desde botón UI)
{"type": "agent_run", "tool": "image_search", "goal": "...", "config": {...}}

// El flow normal genera también permanece igual:
{"type": "generate", "chat_id": "...", "content": "busca imágenes de Tohru..."}
// ws.py detecta el trigger internamente y lo redirige al agente
```

### Servidor → Cliente
```jsonc
// Agente iniciado
{"type": "agent_start",   "tool": "image_search",  "goal": "busca imágenes de Tohru"}

// Paso intermedio (visible en el log de pasos del chat)
{"type": "agent_step",    "tool": "image_search",  "action": "Buscando en Danbooru...", "status": "running"}
{"type": "agent_step",    "tool": "image_search",  "action": "Encontré 180 candidatos", "status": "done"}
{"type": "agent_step",    "tool": "vision_filter",  "action": "Filtrando con CLIP...",  "status": "running"}

// Modelos requeridos no disponibles
{"type": "agent_models_required", "models": ["arcface_w600k"], "tool": "vision_filter"}

// Resultado final
{"type": "agent_result",  "result_type": "image_list", "data": [...], "summary": "..."}

// Fin del agente
{"type": "agent_done",    "summary": "Encontré 67 imágenes verificadas de Tohru"}

// Error
{"type": "agent_error",   "message": "...", "step": "image_fetch"}
```

---

## 7. Tipos de Resultado y Renderizado Frontend

Cada `result_type` tiene un componente React dedicado:

| result_type  | Componente          | Descripción                                              |
|--------------|---------------------|----------------------------------------------------------|
| `text`       | `TextResult.jsx`    | Markdown renderizado, igual que una respuesta normal     |
| `image_list` | `ImageGrid.jsx`     | Grid de thumbnails clickeables, descarga individual/todo |
| `link_list`  | `LinkList.jsx`      | Cards con título, URL, snippet; botón "abrir" / "leer"  |
| `file`       | inline en chat      | Chip con nombre, tamaño, botón descargar                 |
| `error`      | inline en chat      | Mensaje de error con sugerencia de acción                |

El `AgentStepLog.jsx` muestra el log de pasos colapsable encima del resultado:
```
▶ [image_search] Buscando en Danbooru...              ✓
▶ [image_search] Encontré 180 candidatos              ✓
▶ [vision_filter] Filtrando con CLIP...               ✓  67/180 verificadas
▼ Resultado: 67 imágenes de Tohru Dragon Maid
  [grid de thumbnails]
```

---

## 8. Gestión de Modelos ML

### Catálogo (`backend/models/registry.py`)

```python
MODEL_REGISTRY = {
    "yunet": {
        "filename": "face_detection_yunet_2023mar.onnx",
        "path":     "data/models/onnx/face_detection_yunet_2023mar.onnx",
        "url":      "https://huggingface.co/opencv/face_detection_yunet/resolve/main/face_detection_yunet_2023mar.onnx",
        "sha256":   "...",
        "size_mb":  6,
        "auto_download": True,   # se descarga automáticamente al primer uso
        "required_by":  ["vision_filter"],
    },
    "lbpcascade_animeface": {
        "filename": "lbpcascade_animeface.xml",
        "path":     "data/models/onnx/lbpcascade_animeface.xml",
        "url":      "https://raw.githubusercontent.com/nagadomi/lbpcascade_animeface/master/lbpcascade_animeface.xml",
        "size_mb":  0.4,
        "auto_download": True,
        "required_by":  ["vision_filter"],
    },
    "arcface_w600k": {
        "filename": "w600k_r50.onnx",
        "path":     "data/models/onnx/w600k_r50.onnx",
        "url":      "https://huggingface.co/deepinsight/insightface/resolve/main/models/buffalo_l/w600k_r50.onnx",
        "size_mb":  350,
        "auto_download": False,  # requiere confirmación del usuario (grande)
        "required_by":  ["vision_filter"],
    },
    "clip_vit_b32": {
        "filename": "ViT-B-32",
        "path":     "data/models/clip/",
        "managed_by": "open_clip",
        "size_mb":  340,
        "auto_download": False,
        "required_by":  ["vision_filter"],
    },
}
```

### Endpoints (`backend/api/models.py`)

```
GET  /api/agent/models              → estado de todos los modelos (instalado/falta/descargando)
POST /api/agent/models/{id}/download → inicia descarga con progreso SSE
DEL  /api/agent/models/{id}         → elimina modelo del disco
```

### Política de descarga

- Modelos `auto_download: True` y `size_mb < 10`: se descargan silenciosamente al primer uso.
- Modelos grandes o `auto_download: False`: el frontend muestra un prompt de confirmación antes de descargar.
- El progreso de descarga se streama por SSE (`/api/agent/models/{id}/download`).

---

## 9. Configuración del Agente

Almacenada en `data/agent_config.json`:

```jsonc
{
  "enabled": true,
  "max_steps": 10,
  "auto_download_small_models": true,

  "tools": {
    "web_search": {
      "enabled": true,
      "triggers": ["busca en internet", "busca en la web", "qué dice internet sobre"],
      "max_results": 5
    },
    "image_search": {
      "enabled": true,
      "triggers": ["busca imágenes de", "encuentra imágenes de", "descarga imágenes de"],
      "max_candidates": 200,
      "safe_content": true,
      "use_vision_filter": true,
      "vision_threshold": 0.65
    },
    "url_reader": {
      "enabled": true,
      "triggers": ["lee esta página", "resume este artículo"],
      "auto_detect_urls": true
    }
  }
}
```

---

## 10. Herramientas

| ID              | Estado          | Descripción                                          | Modelos requeridos          |
|-----------------|-----------------|------------------------------------------------------|-----------------------------|
| `web_search`    | ✅ Implementada | Búsqueda de texto vía DuckDuckGo (ddgs)              | ninguno                     |
| `url_reader`    | Planificada     | Lee y resume el contenido de una URL                 | ninguno                     |
| `image_search`  | Planificada     | Búsqueda y descarga de imágenes por query            | ninguno (vision_filter opcional) |
| `vision_filter` | Planificada     | Filtra imágenes por similitud semántica o biométrica | yunet, lbpcascade, arcface_w600k, clip_vit_b32 |
| `file_reader`   | Futura          | Lee PDF/TXT y lo inyecta como contexto               | ninguno                     |
| `calculator`    | Futura          | Ejecuta expresiones matemáticas o código Python      | ninguno                     |
| `image_gen`     | Futura          | Genera imágenes vía ComfyUI/SD local                 | externo (ComfyUI)           |

---

## 11. Convenciones para desarrollar nuevas herramientas

1. **Crear el directorio** `backend/agent/tools/{nombre_herramienta}/`
2. **`tool.py`** hereda `BaseTool` y declara `name`, `label`, `description`, `default_triggers`, `requires_models`
3. **`execute()`** es un generador async: emite `AgentStep` durante la ejecución y `ToolResult` al final
4. **El registry** (`registry.py`) escanea `tools/` automáticamente — no hay que registrar nada manualmente
5. **Nunca** importar PySide6, Qt ni dependencias de UI en el backend del agente
6. **Siempre** usar `data/models/` para modelos y `data/downloads/` para outputs
7. **Documentar** en este archivo la herramienta nueva bajo la sección 10

---

## 12. Integración con el chat existente

El flujo en `ws.py` se extiende con un paso previo:

```
mensaje_usuario
    ↓
trigger_router.match(mensaje) → herramienta encontrada?
    ├── Sí → executor.run(herramienta, goal) → stream AgentStep/Result por WS
    └── No → flow normal: build_messages → LLM stream → tokens
```

Los resultados del agente se guardan en el historial del chat como mensajes con
metadata enriquecida (`role: assistant, content: resumen_texto, metadata: {agent_result: {...}}`),
para que el historial sea coherente y legible.

---

---

## 13. Estado de implementación

### Fase 1 — HelperChat UI ✅ Completa (Sesión 22)
- `HelperChat.jsx` — pantalla full-screen, sidebar con tool toggles, log de pasos
- `CharacterManager.jsx` — modo `?mode=helper`, navega a `/helper/:id`
- `Welcome.jsx` — card Helper apunta a `/characters?mode=helper`
- `useChat.js` — acepta `{ helperMode, activeTools, onAgentEvent }`
- `ModelDownloadPopup.jsx` + `useModelDownload.js` — UI de descarga con progreso SSE
- `backend/models/` — `registry.py` + `manager.py` con extracción ZIP

### Fase 2 — Infraestructura agéntica ✅ Completa (Sesión 23)
- `backend/agents/base_tool.py` — BaseTool ABC, ToolResult, AgentStep, ResultType
- `backend/agents/registry.py` — auto-discovery de tools
- `backend/agents/trigger_router.py` — substring normalizado, sin NLP
- `backend/agents/executor.py` — loop ReAct + streaming WS
- `backend/api/ws.py` — interceptor: trigger_router → executor → agent_context → LLM
- `backend/inference/prompt_builder.py` — parámetro `agent_context`
- `backend/agents/tools/web_search/tool.py` — DuckDuckGo, verificado

### Fase 3 — Pendiente
- `url_reader` tool — httpx + html parsing
- `LinkList.jsx` — componente resultado estructurado
- `image_search` tool — búsqueda de imágenes sin API key

### Fase 4 — Pendiente
- Playwright browser automation
- `ImageGrid.jsx`

### Fase 5 — Pendiente
- `vision_filter` — portar recognition_engine de panopticon (sin PySide6)
- `clip_scorer.py`, `image_filter.py`
- Panel de settings para modelos ML

*Última actualización: Sesión 23 — Fase 2 completa, web_search funcional.*
