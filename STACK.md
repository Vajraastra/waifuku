# STACK.md — Análisis técnico del sistema Waifuku

Estado: arquitectura en papel, sin construir. Este documento consolida todas las
capas en un solo mapa con su tecnología recomendada, su costo de memoria y sus
decisiones de diseño. Objetivo rector: **correr en hardware modesto (≤8GB VRAM) sin
perder afecto, memoria ni slots**, soportar español + inglés como mínimo, y ser
**agnóstico del backend de inferencia** — el usuario elige Ollama, LM Studio o una
API tipo OpenRouter; nosotros solo administramos el mecanismo.

> **Cómo usar este documento con Claude Code.** Está redactado como brief de
> implementación: cada capa define un contrato estable y cada paso de la §10 tiene un
> criterio de "hecho". Construí en el orden de la §10, usando los golden tests como
> compuertas de aceptación antes de pasar al siguiente paso. Mantené este archivo en
> el repo como spec viva. El corazón sin construir es la §4 (motor de tags).

---

## 1. Arquitectura en capas

Seis capas. Regla que las mantiene sanas: cada capa habla con la de abajo por un
contrato estable, y **toda la inteligencia vive en los proveedores; el motor de tags
se mantiene tonto** (solo enruta y resuelve).

```
┌─────────────────────────────────────────────────────────────┐
│ 6. API / streaming            FastAPI + SSE/WebSocket         │
├─────────────────────────────────────────────────────────────┤
│ 5. Orquestador del turno      pipeline.py (async)             │
├─────────────────────────────────────────────────────────────┤
│ 4. Proveedores                afecto · tono · memoria · items │
│    (cada uno emite el MISMO record de contribución)           │
├─────────────────────────────────────────────────────────────┤
│ 3. MOTOR DE TAGS  ← el núcleo sin construir                   │
│    parser · registry · resolver de 2 etapas · gating · TTL    │
├─────────────────────────────────────────────────────────────┤
│ 2. Estado y persistencia      SQLite + sqlite-vec             │
├─────────────────────────────────────────────────────────────┤
│ 1. Inferencia (agnóstica)     router de roles → backends BYO  │
│    Ollama · LM Studio · llama.cpp · OpenRouter · OpenAI…      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Capa de inferencia y administración de backends

### 2.1 Principio: BYO-backend, nosotros administramos

Waifuku **no provee ni empaqueta** un motor de inferencia. Provee la capa que
administra conexiones y enruta cada rol al backend que el usuario configuró. Esto
desacopla el sistema del hardware del usuario: alguien con GPU corre todo local;
alguien sin GPU pone el principal en OpenRouter y conserva afecto + memoria + tags
locales. La pieza que nos toca construir es: contrato de backend, router de roles,
detección de capacidades, degradación elegante y gestión de credenciales.

La mayoría de los backends hablan el mismo API compatible con OpenAI (LM Studio,
Ollama, llama.cpp server, OpenRouter, OpenAI), así que un solo adaptador cubre el
grueso; los formatos distintos (p. ej. Anthropic) son adaptadores aparte.

### 2.2 Los cuatro roles enrutables

| Rol | Qué hace | Capacidad crítica |
|---|---|---|
| `principal` | genera al personaje | streaming |
| `tone` | clasifica el tono del usuario | salida JSON (con fallback) |
| `embed` | vectoriza para memoria | endpoint de embeddings |
| `consolidate` | resume async | reusa `principal` por default |

Cada rol apunta, de forma independiente, a un backend + modelo. Mezcla libre:
principal en OpenRouter, tono en LM Studio local, embed en llama.cpp local.

### 2.3 El contrato `Backend` (para Claude Code)

```python
class Capabilities(BaseModel):
    chat: bool
    streaming: bool
    json_schema: bool          # structured output nativo
    embeddings: bool
    multi_model: bool | None = None   # solo relevante en backends locales

class Backend(Protocol):
    async def chat(self, messages, *, model, stream=False,
                   json_schema=None, **opts): ...
    async def embed(self, texts, *, model) -> list[list[float]]: ...
    def capabilities(self, model: str | None = None) -> Capabilities: ...

class RoleRouter:
    def backend_for(self, role: Role) -> tuple[Backend, str]:  # (backend, model)
        ...
    def assert_capability(self, role: Role, cap: str) -> None:
        # lanza ConfigError con mensaje claro si el backend del rol no la soporta
        ...
```

### 2.4 Detección de capacidades y degradación elegante

El router resuelve, por rol, si el backend configurado soporta lo que el rol
necesita. Capacidades por tipo de proveedor (declaradas en un perfil + sondeo de
`/v1/models` cuando aplica):

| Backend | chat | stream | json_schema | embeddings | multi_model |
|---|:--:|:--:|:--:|:--:|:--:|
| LM Studio | ✓ | ✓ | ✓ | ✓ | ✓ |
| Ollama | ✓ | ✓ | ✓ | ✓ | ✓ |
| llama.cpp server | ✓ | ✓ | ✓ | depende | ✗ (1 modelo) |
| OpenRouter | ✓ | ✓ | ✓ | ✗ (limitado) | n/a |
| OpenAI | ✓ | ✓ | ✓ | ✓ | n/a |

Reglas de degradación (importantes para fiabilidad con backends variados):

- **Tono sin `json_schema`:** fallback a instrucción de JSON en el prompt + parser
  tolerante (extraer el primer `{...}`, un reintento de reparación). Nunca asumir
  JSON válido del modelo chico.
- **`embed` sin backend de embeddings:** la memoria semántica degrada a recuperación
  por keyword (el camino lorebook sigue vivo). El sistema funciona, con menos recall.
  Avisar al usuario que para memoria semántica necesita un backend con embeddings
  (local, o una API dedicada tipo OpenAI/Voyage/Cohere/Jina).
- **Un solo backend local sin `multi_model` para varios roles:** si el usuario apunta
  `principal` + `tone` al mismo llama.cpp con un modelo, se rompe la especialización.
  Detectar y advertir; sugerir Ollama/LM Studio (multi-modelo) o backends separados.

### 2.5 Config de ejemplo (el "mecanismo de administración")

```yaml
backends:
  local_lmstudio:
    type: openai_compatible
    base_url: http://localhost:1234/v1
    api_key: lm-studio
  openrouter:
    type: openai_compatible
    base_url: https://openrouter.ai/api/v1
    api_key: ${OPENROUTER_API_KEY}

roles:
  principal:   { backend: openrouter,     model: "google/gemma-4-31b", stream: true }
  tone:        { backend: local_lmstudio,  model: "gemma-4-e2b", json: true }
  embed:       { backend: local_lmstudio,  model: "bge-m3" }
  consolidate: { backend: principal }   # reusa
```

Credenciales: nunca en el archivo de config en claro — resolver `${VAR}` desde
entorno o un keystore. La capa de administración valida la config al arrancar
(conexión + capacidades por rol) y falla temprano con mensaje accionable.

### 2.6 Presets locales recomendados (guía, no obligatorio)

Para el usuario que corre todo local, presets sugeridos. **Todo en quants por
default** — es la norma de la escena; F16 es solo para power users con VRAM de sobra.

| Rol | Modelo | Cuant. default | Dispositivo |
|---|---|---|---|
| principal (ligero ≤8GB) | Gemma 4 E4B | Q4 | GPU |
| principal (alto 16GB) | Gemma 4 26B A4B | Q4 | GPU (4B activos) |
| principal (workstation 24GB+) | Gemma 4 31B | Q4/Q5 | GPU |
| tono | Gemma 4 E2B | Q4 | CPU |
| embed | BGE-M3 / EmbeddingGemma-300M | Q8/INT8 | CPU |

KV cache: **default Q8** (sano para hardware modesto); F16 KV solo si el power user
tiene headroom. Para el principal, GPU offload completo o nada — el offload parcial
tiene un precipicio de rendimiento demasiado pronunciado.

### 2.7 Presupuesto de memoria

| Perfil | VRAM | RAM local | Nota |
|---|---|---|---|
| Todo local (ligero) | ~4 GB | ~3 GB | principal Q4 + KV Q8; tono y embed en CPU |
| Híbrido (principal por API) | ~0 GB | ~2.6 GB | solo tono + embed locales |
| Todo por API | ~0 GB | mínima | embed debe ser API con embeddings o local |

Vector store: ~10 MB / 10k recuerdos (INT8, 1024 dims ≈ 1 KB c/u). Despreciable.

---

## 3. Orquestador del turno

### Camino bloqueante (lo que el usuario espera)

1. **En paralelo, sin tocar el principal:** (a) embedding del mensaje → recuperación
   top-k en memoria episódica + semántica; (b) clasificación de tono.
2. Los proveedores emiten contribuciones (§4, §5).
3. **Motor de tags** resuelve estado (Etapa A) y compone el prompt (Etapa B).
4. **Asignador de presupuesto de tokens** recorta a un budget fijo.
5. Genera el `principal` (streaming al cliente).

### Trabajo diferido (async, después de responder)

6. Si la memoria de trabajo pasó el umbral → consolidar bloque viejo en entrada
   episódica → embedding → store.
7. Extracción de hechos nuevos → memoria semántica.
8. Actualizar resumen rodante. Decrementar TTLs y expirar effects vencidos.

### Presupuesto de tokens (ejemplo @8K)

El largo de contexto dispara el KV cache, así que el budget es **fijo**:

| Bloque | Tokens | Volatilidad |
|---|---|---|
| system + card | 1500 | estable (cacheable) |
| hechos semánticos | 500 | estable |
| episódicos recuperados | 1500 | volátil |
| resumen rodante | 500 | semi |
| turnos literales recientes | 3000 | volátil |
| dirección de escena (tono + mood) | 200 | volátil |
| headroom de respuesta | 800 | — |

---

## 4. El motor de tags (núcleo sin construir)

Resuelve el patrón `{{TipoSlot:default}}` de SLOTS.md más todos los effects de los
proveedores. **Causa del atasco de diseño:** el sistema mezcla dos naturalezas que
necesitan reglas distintas, y por eso un `priority` numérico plano no alcanza. La
solución es un pipeline de **dos etapas**.

```
Turno → [Etapa A: resolver ESTADO] → estado fijo → [Etapa B: componer PROMPT] → texto
```

### 4.1 El record de contribución normalizado

Todo —item estático, afecto, tono, memoria— se normaliza a una sola forma. El motor
no sabe de dónde viene; solo enruta por `target` y resuelve por `origin/priority/order`.

```python
class Contribution(BaseModel):
    source_id: str            # "affect_engine", "item:uuid", "tone_renderer"
    stage: Literal["A", "B"]  # A = estado, B = prompt
    origin: Origin            # la escalera (ver 4.4)
    target: str               # "stat:valencia" | "slot:Mood" | "post_history" | "field:personality"
    op: str                   # add/subtract/set/multiply | replace/append
    value: float | str        # número (Etapa A) o prosa (Etapa B)
    priority: int = 0         # desempate DENTRO del mismo origin
    ttl: str | None = None    # "turns:3" | "scene" | "combat" | None=permanente
    order: int = 0            # inserción, desempate final
```

### 4.2 Parser y registro

- **Parser:** regex `\{\{([A-Za-z0-9_]+):([^}]*)\}\}` sobre el texto de la card.
  Expandir aparte los macros `{{char}}` / `{{user}}` (sustitución simple). Manejar
  tags malformados sin romper.
- **Registro de targets** (no de tipos de slot — esos son libres):

| Target | Etapa | Aridad | Tipo |
|---|---|---|---|
| `stat:*` | A | acumulativo (reduce) | numérico |
| `flag:*` | A | set | booleano |
| `slot:*` | B | valor único (cascada) | texto |
| `field:*` | B | valor único (cascada) | texto |
| `system` / `personality` / `scenario` / `post_history` | B | acumulativo (merge) | texto |

### 4.3 Resolución — Etapa A (reducer de estado)

```python
state = previous_state.copy()
for op in sorted(state_ops, key=lambda c: (c.origin, c.priority, c.order)):
    state = apply(op, state)   # add/subtract/set/multiply
clamp(state)                   # valencia ∈ [-1,1], HP ∈ [0,max]...
```

Dentro del mismo tier, los `set` se aplican **después** de los aritméticos. Salida:
dict puro de datos. Cero prosa.

### 4.4 Resolución — Etapa B (cascada + merge)

```python
class Origin(IntEnum):
    DEFAULT  = 1   # el valor_default de la card. El piso.
    COMPUTED = 2   # afecto, tono, ambiente. La simulación viva.
    EQUIPPED = 3   # items que el usuario equipó deliberadamente.
    EVENT    = 4   # effects scripteados por la narrativa.
    FORCED   = 5   # override explícito (swap de NPC, debug). El "!important".
```

- **Valor único** (`slot:*`, `field:*`): gana uno, por `(origin, priority, order)`.
  Modelo mental: la cascada de CSS.
- **Acumulativo** (`system`, `personality`, `post_history`): todos contribuyen, se
  concatenan en el mismo orden.

### 4.5 Gating de condiciones (`activate_if`) — guardarraíl crítico

**Regla que mata una clase entera de bugs:** el gating lee el **estado committeado del
turno anterior**; las mutaciones de este turno recién afectan el gating del siguiente.
Leés el frame previo, escribís el actual. Determinista, sin loops; el delay de un
turno es invisible en RP. **No** intentes punto-fijo en el mismo turno.

Evaluador **seguro** de expresiones: nunca `eval()` sobre strings del usuario. Usá
`simpleeval` o un parser propio mínimo (`==`, `>=`, `AND`, `OR`, refs `flag:x`/`stat:y`).

### 4.6 Gestión de TTL

Trackeá el ciclo de vida de cada effect (`combat`/`scene`/`turns:N`/`permanent`),
decrementá por turno, expirá. Es lo que permite que un evento pise un item equipado
**solo temporalmente** (ver decisión §11).

### 4.7 Disciplina de caché (protege al modelo de 4B)

**Regla dura: ningún proveedor computado por turno escribe jamás a `system` o
`personality`.** Esos son targets estables (prefijo cacheable del KV). Los `computed`
escriben a `stat:*` (Etapa A, no toca el prompt) y a `post_history`/baja profundidad
(zona volátil ya esperada). Si el mood inyecta en `personality` cada turno, invalidás
el prefijo del KV y pagás reprocesamiento completo en cada mensaje.

### 4.8 Testabilidad

100% determinista → golden tests: `(estado_previo, contribuciones)` → prompt esperado.
Construilos desde el día uno; son la red de seguridad al agregar proveedores.

---

## 5. Capa de proveedores

Cada proveedor emite el mismo `Contribution`. **Contrato de la capa:** todo lo que le
habla al personaje emite prosa de acotación, nunca datos crudos.

| Proveedor | Qué emite | Stage / Origin / Target |
|---|---|---|
| Afecto | mueve valencia/activación según triggers | A / computed / `stat:valencia` |
| Render de mood | lee el stat resuelto → prosa vía `emotion_expression` | B / computed / `slot:Mood` |
| Tono | clasificador JSON → renderer determinista → dirección de escena | B / computed / `post_history` (ttl 1 turno) |
| Memoria | recuperación semántica/keyword → pistas en prosa | B / computed / `post_history` |
| Items equipados | sombrero, clase, outfit | B / equipped / `slot:*` o `field:*` |
| Eventos | dados, flags, triggers narrativos | A+B / event / varios |

**Render de tono:** el clasificador escupe JSON, pero el personaje **nunca ve el
JSON**. Un renderer determinista (plantillas Python, sin LLM) convierte JSON + estado
+ reglas de card en una acotación corta. Sin números, sin claves, sin verbos
analíticos. Enmarcado como dirección de guion u OOC.

---

## 6. Estado y persistencia

Portabilidad → **un solo archivo SQLite** lleva casi todo.

- **SQLite** (SQLModel/SQLAlchemy o `sqlite3`): cards, items, sesiones, stats, flags,
  resumen rodante. Single-file, cero infra.
- **sqlite-vec**: vectores de memoria **en el mismo archivo**. Una sola base, sin
  servicio vectorial aparte. Alternativas al escalar: LanceDB o Qdrant (embebidos).

Tablas mínimas: `cards`, `items`, `sessions`, `session_state` (mood, afinidad,
mood_window), `stats`, `flags`, `episodic_memory` (texto + tono + entidades + vector),
`semantic_facts` (texto + vector).

**Separación clave:** definición inmutable de la card (seed) vs. estado de sesión
mutable, persistidos aparte.

---

## 7. Subsistema de memoria

Tres alcances, todos alimentando el mismo canal de effects:

- **De trabajo:** últimos N turnos literales (en el budget).
- **Resumen rodante:** comprime lo que sale de la ventana; async.
- **Episódica:** consolidación cada N turnos → entrada compacta (qué pasó + tono +
  entidades) → embedding → sqlite-vec. No guardás palabras exactas; guardás el gist.
- **Semántica:** hechos estables extraídos (la ficha que crece sola).

**Worker de consolidación:** tarea `asyncio` que reusa el rol `consolidate` (contexto
aislado → sin bleeding). Corre después de responder, nunca bloquea.

Referencias de diseño (no dependencias): Zep, Mem0, Letta.

---

## 8. Stack maestro

| Capa | Responsabilidad | Tecnología | Costo |
|---|---|---|---|
| API | streaming, sesiones | FastAPI + SSE/WebSocket | trivial |
| Orquestador | pipe por turno, budget | asyncio, propio | trivial |
| Proveedores | afecto, tono, memoria, items | propio | CPU ligero |
| **Motor de tags** | parse + resolve 2 etapas | propio + Pydantic + simpleeval | trivial |
| Estado | persistencia | SQLite (SQLModel) | ~MB |
| Vectores | memoria semántica | sqlite-vec | ~MB |
| **Admin de backends** | router de roles + capacidades | propio + httpx / SDKs | trivial |
| Inferencia | BYO: Ollama/LM Studio/llama.cpp/OpenRouter… | del usuario | según elección |
| Embeddings | vectorizar | BGE-M3 vía backend con embeddings | RAM o API |
| Validación | modelo de datos | Pydantic v2 | trivial |

---

## 9. Estructura de módulos

El corazón es `engine/`. La inferencia es `backends/` (distinto de `providers/`, que
son los proveedores de contribuciones).

```
waifuku/
  backends/           # ← inferencia agnóstica (BYO)
    base.py           # Protocol Backend + Capabilities
    openai_compat.py  # LM Studio / Ollama / llama.cpp / OpenRouter / OpenAI
    anthropic.py      # adaptador formato Anthropic (opcional)
    router.py         # rol → backend+model + assert_capability
    config.py         # schema de config + resolución de credenciales
  engine/             # ← el motor de tags
    parser.py         # {{...}} + macros
    registry.py       # registro de targets (stage, aridad, tipo)
    contribution.py   # el record normalizado
    resolve_state.py  # Etapa A: reducer
    resolve_prompt.py # Etapa B: cascada + merge
    conditions.py     # evaluador seguro de activate_if
    ttl.py            # gestor de duraciones
  providers/          # ← proveedores de contribuciones
    affect.py
    tone_render.py
    memory.py
    items.py
  memory/
    store.py          # interfaz sqlite-vec
    consolidate.py    # worker async
    extract.py        # hechos semánticos
  pipeline.py         # orquestador del turno
  state.py            # session state, stats, flags
  cards.py            # modelos card/item + adaptador import ST
  budget.py           # asignador de tokens + perfiles
  api.py              # FastAPI + streaming
```

---

## 10. Orden de construcción (con criterio de "hecho")

1. **`engine/contribution.py` + `engine/registry.py`** — el contrato. ~50 líneas
   Pydantic + enums. *Hecho cuando:* los modelos validan y serializan.
2. **`engine/resolve_state.py` + `engine/resolve_prompt.py`** — las dos etapas, con
   golden tests. ~150 líneas. *Hecho cuando:* pasan los tests de cascada, merge y
   reduce con casos de empate por origin/priority/order. *El motor ya funciona aislado.*
3. **`engine/parser.py`** — conectar cards reales. *Hecho cuando:* una card con slots
   resuelve a texto plano correcto.
4. **`state.py` + persistencia SQLite** — *Hecho cuando:* el estado sobrevive entre
   turnos en disco.
5. **`backends/` (base + openai_compat + router + config)** — *Hecho cuando:* un rol
   apunta a un backend OpenAI-compatible y responde; `assert_capability` falla claro
   ante config inválida.
6. **`pipeline.py` (con un item estático)** — un turno extremo a extremo. *Hecho
   cuando:* mensaje → prompt resuelto → respuesta del `principal`.
7. **`providers/affect.py` + `tone_render.py`** — *Hecho cuando:* el tono mueve el mood
   y aparece como dirección de escena en `post_history`. *El RP deja de ser plano.*
8. **`memory/`** — episódica + semántica + worker. *Hecho cuando:* un recuerdo viejo se
   recupera por similitud y entra al contexto.
9. **`engine/conditions.py` + `ttl.py`** — gating y duraciones (habilita Tier 3 de
   SLOTS.md). *Hecho cuando:* un `activate_if` lee el frame previo y un effect con
   `turns:3` expira.
10. **`cards.py` adaptador ST** — *Hecho cuando:* una card V2 importa sin cambios.

---

## 11. Decisiones tomadas (locked)

- **Jerarquía equipped vs. event:** gana `event`, pero **con TTL**. El mundo puede
  sacudir al personaje por encima de lo que el jugador equipó, pero el override es
  temporal (`duration`); al expirar, vuelve a mandar lo equipado. La escalera de §4.4
  es la implementación. Configurable, pero este es el default.
- **Quantización por default:** Q4 en todos los roles (norma de la escena). F16 es
  opción de power user, no default.
- **KV cache:** default Q8 (sano para hardware modesto). F16 KV solo con headroom.
- **Inferencia agnóstica:** Waifuku administra, no provee backend. El usuario elige y
  configura por rol (§2).

---

## 12. Decisiones abiertas restantes

- **Política de merge en `post_history`:** cuántas pistas (tono + memoria + effects)
  caben antes de saturar al 4B. Default propuesto: un único bloque de dirección de
  escena, compuesto y cap-eado por el budget de §3 — no apilar fragmentos crudos.
- **Localización stats vs. render:** los stats son neutrales de idioma; el render a
  prosa usa `active_lang`. Confirmar que `emotion_expression` está localizado.
- **Tabla de capacidades por proveedor:** mantenerla como datos editables (no
  hardcode), porque los backends cambian features seguido.
