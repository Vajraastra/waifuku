# HANDOFF — Waifuku: próxima sesión

> Traspaso para la próxima sesión de Claude Code. Contexto: las sesiones 25-26 (2026-06-29)
> hicieron el **salto Linux → Windows 11** (FASE 7, completa y verificada) y arreglaron el
> **flujo de configuración de servidor**. El próximo gran bloque de trabajo es la **FASE 6**
> (presupuesto de contexto, HUD honesto, rendimiento), que sigue intacta.

---

## Contexto esencial

- Waifuku: interfaz local de inferencia LLM para RP estilo Visual Novel. Backend Python/FastAPI/WS,
  frontend React 19 + Zustand + Vite 8, persistencia JSON por archivo en `data/`.
- **El provider en uso real es LM STUDIO** (`openai_compat`), corriendo en `http://localhost:1234`.
  Importante: hay que **iniciar el server** en LM Studio (pestaña Developer) — abrir la app no basta.
  El puerto `:41343` es el proceso interno de la app, NO la API. La API nativa `/api/v0/models`
  expone `max_context_length`/`loaded_context_length` (clave para FASE 6.2).
- **Filosofía rectora: autocontención total.** Todo vive dentro del proyecto, cero dependencias del
  SO. Ver memoria `waifuku-autocontencion` y `waifuku-windows-compat`.

## Cómo arrancar (Windows — plataforma de desarrollo actual)

```
run-dev.bat        # doble clic
```

- Primer arranque: descarga Python embebido (`runtime/python/`) y Node portable (`runtime/node/`)
  DENTRO del proyecto (~60 MB), instala deps y levanta backend (uvicorn `--reload`, :8000) +
  frontend (vite HMR, :5173) en ventanas separadas. Abre el navegador solo en :5173.
- **Para reinstalar limpio:** borrar la carpeta `runtime/` entera (reemplaza al viejo `venv`).
  Los datos de usuario viven en `data/`, intocables.
- LM Studio debe estar corriendo con un modelo cargado **y el server iniciado** en :1234.

Verificación rápida sin UI (con `runtime/python`): `python -m uvicorn backend.main:app --port 8000`
y `GET /health`, `GET /api/v1/system/stats`.

## Estado: lo hecho en sesiones 25-26 (NO re-hacer)

- **FASE 7 — Compatibilidad Windows ✅** (detalle en BITACORA Sesión 25, checklist en TASKS FASE 7):
  - Encoding UTF-8 explícito en todos los `read_text`/`write_text` (storage.py, characters.py, models.py).
  - `system.py`: `CREATE_NO_WINDOW` en nvidia-smi/rocm-smi; `psutil` agregado a requirements.
  - Rutas absolutas ancladas a `__file__` (registry.py); `mktemp`→`mkstemp`.
  - Launcher `run-dev.bat` autocontenido + carpeta `runtime/` única + `LEEME.txt`.
  - Verificado end-to-end: stats de hardware, persistencia UTF-8 (japonés+emoji), chat streaming
    contra LM Studio.
- **Config de servidor ✅** (BITACORA Sesión 26):
  - Conectar desde autodescubrir / seleccionar perfil ahora **persiste al `configStore` al instante**
    (antes solo el botón "Guardar", que el usuario no encontraba).
  - `useAutoDiscover` (hook nuevo, invocado en `App.jsx`): autoconexión al arrancar. Política:
    último servidor usado si sigue vivo, si no cualquiera vivo, si no hay nada → no hace nada (no
    bloqueante). Offline muestra solo "offline" sin nombrar server.
  - Fix race condition del parpadeo online→offline→online en `useProviderStatus` (token incremental
    que descarta chequeos obsoletos).

## Gotchas de Windows aprendidos (evitar repetir)

- **Encoding:** nunca confiar en el default de la plataforma; UTF-8 explícito en I/O de texto.
- **Python embebido:** su `._pth` restringe `sys.path` e IGNORA `PYTHONPATH`. Para importar `backend`
  hay que añadir la raíz del proyecto al `._pth` (`..\..` con python en `runtime/python/`).
- **node_modules cross-platform:** uno instalado en Linux es INSERVIBLE en Windows (shims symlink +
  esbuild de otra plataforma). El `.bat` valida `node_modules\.bin\vite.cmd` y reinstala si falta.
- **Vite 8 exige Node `^22.13.0`** (no 22.12). Batch: escapar `^(` `^)` en echos dentro de bloques.
- **subprocess en Windows:** todo subproceso invisible necesita `CREATE_NO_WINDOW`.

---

## PRÓXIMO TRABAJO — FASE 6 (orden sugerido, cada paso destraba el siguiente)

Plan completo con checkboxes en **TASKS.md → FASE 6**. Diagnóstico original en BITACORA "Sesión 24".

### 6.1 — Refactor `ws.py` + fixes de corrección backend (empezar por acá)
- `backend/api/ws.py`: `_handle_generate` y `_handle_regenerate` duplican ~80 líneas. Extraer
  `_load_context()` (chat/character/persona/items), `_parse_config()` (ProviderConfig) y
  `_stream_to_ws()` (loop de streaming con protocolo thinking).
- Persistir el mensaje del usuario inmediatamente tras `chat.add_message()` (hoy `save()` solo tras
  streaming exitoso → si la inferencia falla, el mensaje se pierde al recargar).
- Pasar `helper_mode` a `build_messages` en `_handle_regenerate` (hoy regenera como RP en Helper).
- `openai_compat.py`: enviar `top_k` y `repeat_penalty` en el payload (LM Studio los acepta).

### 6.2 — Presupuesto de contexto provider-agnóstico (NÚCLEO)
- `backend/inference/prompt_builder.py` → `build_messages`: presupuesto de tokens (estimador
  chars/4; efectivo = context_budget − max_tokens − margen ~10%):
  1. Reservar SIEMPRE: system + card completa + items resueltos.
  2. Reservar el primer mensaje del chat (ancla de tono).
  3. Reservar los últimos N mensajes que quepan. Recortar solo del medio-antiguo (nunca FIFO ciego;
     hoy `chat.py:get_context_window` = últimos 40).
- `context_budget` viaja en el config del WS (reusar `numCtx` del configStore).
- **LM Studio:** autodetectar el contexto del modelo cargado vía `GET {base_url}/api/v0/models`
  (`max_context_length` del modelo con `state: loaded`). Fallback a valor manual.
- Log por inferencia: provider, modelo, budget, tokens estimados, nº de mensajes recortados.

### 6.3 — Re-inyección del personaje en profundidad
- Campo opcional `character_reminder` en la card (2-4 líneas: voz, rasgos, regla). Inyectar como
  system a profundidad fija (~4 mensajes antes del final) cada request. Infra ya existe
  (`prompt_builder.py` inyecta `post_history` al final). Opt-in, compat ST V2 intocable.

### 6.4 — HUD honesto
- Providers devuelven usage real al cerrar el stream (Ollama: `prompt_eval_count`/`eval_count`;
  OpenAI-compat: `stream_options.include_usage`). Propagar en el evento `done` del WS.
- `useLLMStats.js`: `ctxLimit` = presupuesto efectivo real (hoy muestra recomendación por VRAM);
  `ctxUsed` = tokens reales del último request (hoy chars/4 de solo mensajes visibles).

### 6.5 — Rendimiento frontend
- **Closure obsoleto en `useChat.js`** (bug, no solo perf): el efecto de conexión (deps `[chatId]`)
  captura `_handleMessage` del primer render → `isStreaming` y `onAgentEvent` congelados. Fix:
  `handlerRef.current = _handleMessage` en cada render; `socket.onmessage = e => handlerRef.current(...)`.
- Buffer de tokens en `chatStore.appendToken` con flush por rAF.
- `React.memo` en `ChatLine` + aislar la línea en streaming. Scroll `behavior:'auto'` en streaming.
- `regenerate`: `removeMessage(lastAssistant.id)` en vez de `popLastMessage()`.

### 6.6 — Verificación
- Chat 50+ mensajes en LM Studio: la card sobrevive íntegra (inspeccionar el prompt construido) y
  el personaje mantiene voz. tokens/seg igual o mejor. Budget visible en logs.
- Cada fix en BITACORA (síntoma→causa→solución→lección) y checkbox en TASKS FASE 6.

---

## Pendientes menores
- **7.6** — Unificar `scripts/waifuku.bat` (release) a la estructura `runtime/` (hoy usa
  `python_embed/` en la raíz con su propio menú instalar/desinstalar).
- Backlog: code-splitting del bundle (~695 kB, GSAP el mayor), TTS, lorebooks, swipes.

## Convenciones a respetar
- Autocontención: cero dependencias del SO; todo en el proyecto.
- BITACORA.md por cada fix; TASKS.md como checklist de avance.
- UTF-8 explícito en I/O de texto (Windows).
- El LLM nunca ve sintaxis de slots `{{...}}` — se resuelve en el prompt builder.
- Compatibilidad cards SillyTavern V2 intocable; campos nuevos opcionales/opt-in.
- UI bilingüe ES/EN — strings nuevos en ambos `frontend/src/locales/{en,es}.json`.
- Contraste WCAG AA en cambios de UI (THEMES.md).
