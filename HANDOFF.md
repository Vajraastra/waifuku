# HANDOFF — Waifuku: próxima sesión

> Traspaso para la próxima sesión de Claude Code. Contexto: las sesiones 27-30 (2026-06-29)
> avanzaron la **FASE 6** (presupuesto de contexto y rendimiento). Hecho: **6.1, 6.2, 6.3
> completas + 6.4 BACKEND**. El próximo trabajo es el **FRONTEND de 6.4** (HUD honesto), y luego
> 6.5 (rendimiento) y 6.6 (verificación).

---

## Contexto esencial

- Waifuku: interfaz local de inferencia LLM para RP estilo Visual Novel. Backend Python/FastAPI/WS,
  frontend React 19 + Zustand + Vite 8, persistencia JSON por archivo en `data/`.
- **El provider en uso real es LM STUDIO** (`openai_compat`), en `http://localhost:1234`. Hay que
  **iniciar el server** en LM Studio (pestaña Developer) — abrir la app no basta. La API nativa
  `/api/v0/models` expone `loaded_context_length`/`max_context_length` (lo usa 6.2).
- **Filosofía rectora: autocontención total.** Todo vive dentro del proyecto, cero deps del SO.
  Ver memorias `waifuku-autocontencion` y `waifuku-windows-compat`.
- **Formato de card:** NO hay formato propio cerrado. Waifuku es **superconjunto de ST V2**: card
  estándar + bloque aditivo `extensions["waifuku"]`. Card sin bloque = ST puro. Ver `SLOTS.md` y la
  memoria `waifuku-formato-card`. Primer uso real del bloque: `character_reminder` (6.3).

## Cómo arrancar (Windows — plataforma de desarrollo)

```
run-dev.bat        # doble clic
```
- Primer arranque: descarga Python embebido (`runtime/python/`) y Node portable (`runtime/node/`)
  DENTRO del proyecto (~60 MB), instala deps y levanta backend (uvicorn `--reload`, :8000) +
  frontend (vite HMR, :5173). Reinstalar limpio: borrar `runtime/` entera. Datos de usuario en `data/`.
- LM Studio debe estar corriendo con un modelo cargado **y el server iniciado** en :1234.
- Verificación sin UI (`runtime/python`): `python -m py_compile <archivo>`; o levantar uvicorn y
  `GET /health`, `GET /api/v1/system/stats`.

## Estado: lo hecho en sesiones 27-30 (NO re-hacer)

- **6.1 — Refactor `ws.py` + fixes ✅:** helpers `_load_context`/`_parse_config`/`_stream_to_ws`;
  el mensaje del usuario se persiste de inmediato (antes se perdía si fallaba la inferencia);
  `helper_mode` en regenerate; limpieza `ollama.py`; `top_k`/`repeat_penalty` en `openai_compat`.
- **6.2 — Presupuesto de contexto provider-agnóstico ✅ (núcleo):** `prompt_builder.build_messages`
  con estimador chars/4. Reserva system+card+items y el primer mensaje (ancla); recorta solo el
  medio-antiguo. `ws.py` resuelve el budget (autodetect LM Studio vía `/api/v0/models` →
  `loaded_context_length`; fallback manual/default 4096), inyecta `num_ctx` en Ollama, loggea por
  inferencia. `ollama.py` envía `num_ctx` siempre. Firma de `build_messages` retrocompatible.
- **6.3 — Re-inyección de personaje ✅:** campo opt-in `character_reminder` re-inyectado como system
  a profundidad fija `REMINDER_DEPTH=4` dentro del historial (su costo se reserva en el presupuesto).
  Round-trip ST V2 vía `extensions["waifuku"]` (spec intocable). API (schemas) + UI
  (`CharacterCreator.jsx`) + strings es/en.
- **6.4 — HUD honesto: BACKEND ✅ / FRONTEND pendiente:**
  - `base.py`: `provider.last_usage: dict|None`.
  - `ollama.py`: captura `prompt_eval_count`/`eval_count`.
  - `openai_compat.py`: `stream_options.include_usage` + parser tolerante al chunk de usage.
  - `ws.py`: `_build_usage()` viaja en `done.usage` (generate y regenerate).
  - El `done.usage` extra es inofensivo para el frontend actual (lo ignora) → ya está commiteado.

## PRÓXIMO TRABAJO — empezar por el FRONTEND de 6.4

Checklist exacto en **TASKS.md → 6.4**. Pasos:
1. `frontend/src/store/chatStore.js`: estado `lastUsage: null` + acción `setUsage(u)`.
2. `frontend/src/hooks/useChat.js`: en `case 'done'`, `setUsage(msg.usage)` (sacar `setUsage` del store).
3. `frontend/src/hooks/useLLMStats.js`: leer `lastUsage` de `useChatStore`. Si existe →
   `ctxUsed = lastUsage.prompt_tokens ?? lastUsage.estimated_prompt`,
   `ctxLimit = lastUsage.effective_budget`. Si no → fallback actual (chars/4 + `recCtx`).
4. `frontend/src/components/LLMStatsHUD.jsx` (líneas ~163-170): etiqueta "real" vs "~estimado" según
   `lastUsage.is_real`; el límite mostrado pasa a ser el efectivo, no "Ctx config".

### 6.5 — Rendimiento frontend (tras 6.4)
- **Closure obsoleto en `useChat.js`** (bug real): el efecto de conexión (deps `[chatId]`) captura
  `_handleMessage` del primer render → `isStreaming`/`onAgentEvent` congelados. Fix: `handlerRef`
  actualizado en cada render; `socket.onmessage = e => handlerRef.current(...)`.
- Buffer de tokens en `chatStore.appendToken` con flush por rAF.
- `React.memo` en `ChatLine` + aislar la línea en streaming. Scroll `behavior:'auto'` en streaming.
- `regenerate`: ya usa `deleteMessage` + `popLastMessage` (ok); revisar pasar a `removeMessage(id)`.
- `useLLMStats` sin suscripción a `streamingContent` (recalcular en `done`) — encaja con 6.4.

### 6.6 — Verificación
- Chat 50+ mensajes en LM Studio Y Ollama: card íntegra, voz mantenida, budget visible en logs,
  HUD muestra tokens reales. Cada fix en BITACORA (síntoma→causa→solución→lección) + checkbox TASKS.

## Gotchas aprendidos (no repetir)

- **LM Studio:** el límite real es `loaded_context_length`, no `max_context_length` (puede cargarse
  con ventana menor que el máximo del modelo).
- **`openai_compat` con `include_usage`:** el chunk final trae `choices: []` + `usage`. El parser
  debe tolerar `choices` vacío (usar `choices or []`), si no se pierde el usage.
- **Windows:** UTF-8 explícito en I/O; subprocesos invisibles con `CREATE_NO_WINDOW`; Python embebido
  ignora `PYTHONPATH` (usa `._pth`); `node_modules` de Linux es inservible en Windows.
- **Git:** identidad ya configurada en el repo (`Vajraastra <103834112+Vajraastra@users.noreply...>`).
  Commits van directo a `main` (repo personal single-dev). Warnings LF→CRLF son normales.

## Convenciones a respetar
- Autocontención: cero deps del SO. UTF-8 explícito en I/O de texto.
- BITACORA.md por cada fix; TASKS.md como checklist. (Ambos ignorados por git — son docs privados.)
- El LLM nunca ve sintaxis de slots `{{...}}` — se resuelve en el prompt builder.
- Compatibilidad ST V2 intocable; campos nuevos opcionales/opt-in y vía `extensions["waifuku"]`.
- UI bilingüe ES/EN — strings nuevos en ambos `frontend/src/locales/{en,es}.json`.
- Contraste WCAG AA en cambios de UI (THEMES.md).

## Pendientes menores / backlog
- **7.6** — Unificar `scripts/waifuku.bat` (release) a la estructura `runtime/`.
- Formalizar subschema de `extensions["waifuku"]` en SLOTS.md (cuando todo esté estable — pedido del
  usuario: implementar el formato propio recién al final).
- Backlog: code-splitting del bundle (~695 kB), TTS, lorebooks, swipes, mecánicas Tier 3 (SLOTS.md).
