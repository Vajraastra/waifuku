"""
Endpoint para listar, probar, instalar y desinstalar modelos.
Soporta Ollama y providers compatibles con OpenAI.
Instalación: HuggingFace vía /api/pull, GGUF local vía blob upload, modelo existente vía /api/create.
"""
import asyncio
import hashlib
import time
import json
import httpx
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from pathlib import Path
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/models", tags=["models"])

OLLAMA_DEFAULT = "http://localhost:11434"
OPENAI_DEFAULT = "https://api.openai.com/v1"

# Servidores LLM conocidos y sus puertos/rutas de detección
_KNOWN_SERVERS = [
    {"name": "Ollama",              "port": 11434, "type": "ollama",        "probe": "/api/tags"},
    {"name": "LM Studio",           "port": 1234,  "type": "openai_compat", "probe": "/v1/models"},
    {"name": "Jan",                 "port": 1337,  "type": "openai_compat", "probe": "/v1/models"},
    {"name": "llama.cpp / LocalAI", "port": 8080,  "type": "openai_compat", "probe": "/v1/models"},
    {"name": "Text Gen WebUI",      "port": 5000,  "type": "openai_compat", "probe": "/v1/models"},
    {"name": "Kobold.cpp",          "port": 5001,  "type": "openai_compat", "probe": "/v1/models"},
    {"name": "vLLM",                "port": 8000,  "type": "openai_compat", "probe": "/v1/models"},
    {"name": "GPT4All",             "port": 4891,  "type": "openai_compat", "probe": "/v1/models"},
]


async def _probe_server(client: httpx.AsyncClient, server: dict) -> dict | None:
    url = f"http://localhost:{server['port']}"
    try:
        resp = await client.get(f"{url}{server['probe']}")
        if resp.status_code >= 400:
            return None
        data = resp.json()
        if server["type"] == "ollama":
            models = [m["name"] for m in data.get("models", [])]
        else:
            models = [m["id"] for m in data.get("data", [])]
        return {
            "name":   server["name"],
            "url":    url,
            "type":   server["type"],
            "models": models[:15],
        }
    except Exception:
        return None


@router.get("/discover")
async def discover_servers():
    """Escanea puertos locales en busca de servidores LLM conocidos."""
    async with httpx.AsyncClient(timeout=2.5) as client:
        results = await asyncio.gather(
            *[_probe_server(client, s) for s in _KNOWN_SERVERS],
            return_exceptions=True,
        )
    servers = [r for r in results if isinstance(r, dict)]
    return {"servers": servers}


@router.get("/ps")
async def running_models(
    provider: str = Query("ollama"),
    base_url: Optional[str] = Query(None),
    api_key:  Optional[str] = Query(None),
    api_base: str           = Query("/v1"),
):
    """
    Modelos actualmente cargados en memoria.
    - Ollama: proxea /api/ps — da size_vram y size por modelo.
    - openai_compat: consulta {api_base}/models — devuelve modelo activo sin stats de memoria
      (LM Studio no expone un endpoint estándar de sistema/GPU).
    """
    if provider == "ollama":
        url = (base_url or OLLAMA_DEFAULT).rstrip("/")
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(f"{url}/api/ps")
                resp.raise_for_status()
                return resp.json()
        except httpx.ConnectError:
            return {"models": [], "error": "No se pudo conectar a Ollama"}
        except httpx.TimeoutException:
            return {"models": [], "error": "Timeout"}
        except Exception as e:
            return {"models": [], "error": str(e)}

    # ── openai_compat (LM Studio, Jan, llama.cpp, etc.) ───────────────────────
    host    = (base_url or OPENAI_DEFAULT).rstrip("/")
    ab      = api_base.rstrip("/") if api_base else "/v1"
    headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}

    async with httpx.AsyncClient(timeout=5) as client:
        try:
            resp = await client.get(f"{host}{ab}/models", headers=headers)
            resp.raise_for_status()
            data = resp.json()
            raw  = data.get("data", [])
            models = []
            for m in raw:
                # LM Studio marca modelos no cargados con state != "loaded"
                if m.get("state", "loaded") not in ("loaded", ""):
                    continue
                models.append({
                    "name":      m.get("id", "unknown"),
                    "model":     m.get("id", "unknown"),
                    "size":      0,
                    "size_vram": 0,
                    "_details":  m,
                })
            return {"models": models}
        except Exception as e:
            return {"models": [], "error": f"No se pudo obtener modelos: {e}"}


@router.get("/")
async def list_models(
    provider: str  = Query("ollama"),
    base_url: Optional[str] = Query(None),
    api_key:  Optional[str] = Query(None),
    api_base: str  = Query("/v1"),
):
    try:
        if provider == "ollama":
            return await _list_ollama(base_url or OLLAMA_DEFAULT)
        else:
            return await _list_openai_compat(base_url or OPENAI_DEFAULT, api_key, api_base)
    except httpx.ConnectError:
        return {"models": [], "error": "No se pudo conectar al provider"}
    except httpx.TimeoutException:
        return {"models": [], "error": "Timeout al conectar con el provider"}
    except Exception as e:
        return {"models": [], "error": str(e)}


async def _list_ollama(base_url: str) -> dict:
    base_url = base_url.rstrip("/")
    async with httpx.AsyncClient(timeout=8) as client:
        resp = await client.get(f"{base_url}/api/tags")
        resp.raise_for_status()
        data = resp.json()
        models = [m["name"] for m in data.get("models", [])]
        return {"models": models, "provider": "ollama"}


class TestModelRequest(BaseModel):
    provider: str = "ollama"
    model: str
    base_url: str = ""
    api_key: str = ""
    api_base: str = "/v1"


@router.post("/test")
async def test_model(req: TestModelRequest):
    """Manda un mensaje mínimo al modelo y reporta si carga y responde."""
    base_url = (req.base_url or OLLAMA_DEFAULT).rstrip("/")
    t0 = time.monotonic()
    try:
        if req.provider == "ollama":
            payload = {
                "model": req.model,
                "messages": [{"role": "user", "content": "hi"}],
                "stream": False,
                "options": {"num_predict": 3},
            }
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(f"{base_url}/api/chat", json=payload)
                if resp.status_code >= 400:
                    detail = resp.json().get("error", resp.text)
                    return {"ok": False, "error": detail}
                data = resp.json()
                reply = (data.get("message") or {}).get("content", "").strip()
        else:
            ab      = (req.api_base or "/v1").rstrip("/")
            headers = {"Authorization": f"Bearer {req.api_key}"} if req.api_key else {}
            payload = {
                "model": req.model,
                "messages": [{"role": "user", "content": "hi"}],
                "max_tokens": 3,
            }
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(f"{base_url}{ab}/chat/completions", json=payload, headers=headers)
                if resp.status_code >= 400:
                    detail = (resp.json().get("error") or {}).get("message", resp.text)
                    return {"ok": False, "error": detail}
                data = resp.json()
                reply = data["choices"][0]["message"]["content"].strip()

        elapsed = round((time.monotonic() - t0) * 1000)
        return {"ok": True, "model": req.model, "reply": reply, "time_ms": elapsed}

    except httpx.ConnectError:
        return {"ok": False, "error": "No se pudo conectar al provider"}
    except httpx.TimeoutException:
        return {"ok": False, "error": "Timeout — el modelo tardó más de 30 s en responder"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ── Templates estándar para Modelfile ─────────────────────────────────────────

_TEMPLATES = {
    "llama3": (
        "{{ if .System }}<|start_header_id|>system<|end_header_id|>\n\n"
        "{{ .System }}<|eot_id|>{{ end }}"
        "{{ range .Messages }}<|start_header_id|>{{ .Role }}<|end_header_id|>\n\n"
        "{{ .Content }}<|eot_id|>{{ end }}"
        "<|start_header_id|>assistant<|end_header_id|>\n\n"
    ),
    "gemma": (
        "{{ if .System }}<start_of_turn>user\n{{ .System }}<end_of_turn>\n{{ end }}"
        "{{ range .Messages }}<start_of_turn>{{ .Role }}\n{{ .Content }}<end_of_turn>\n{{ end }}"
        "<start_of_turn>model\n"
    ),
    "chatml": (
        "{{ if .System }}<|im_start|>system\n{{ .System }}<|im_end|>\n{{ end }}"
        "{{ range .Messages }}<|im_start|>{{ .Role }}\n{{ .Content }}<|im_end|>\n{{ end }}"
        "<|im_start|>assistant\n"
    ),
    "mistral": (
        "{{ if .System }}[INST] {{ .System }}\n{{ end }}"
        "{{ range .Messages }}{{ if eq .Role \"user\" }}[INST] {{ .Content }} [/INST]"
        "{{ else }}{{ .Content }}</s>{{ end }}{{ end }}"
    ),
    "phi3": (
        "{{ if .System }}<|system|>\n{{ .System }}<|end|>\n{{ end }}"
        "{{ range .Messages }}{{ if eq .Role \"user\" }}<|user|>\n{{ .Content }}<|end|>\n"
        "{{ else }}<|assistant|>\n{{ .Content }}<|end|>\n{{ end }}{{ end }}"
        "<|assistant|>\n"
    ),
}


def _parse_source(source: str) -> str:
    """Convierte URL de HuggingFace al formato que acepta Ollama en FROM.

    Ollama soporta dos formatos HF:
      hf.co/user/repo            → descarga el mejor GGUF del repo
      hf.co/user/repo:file.gguf  → archivo específico

    Las URLs de HF con /blob/main/ o /resolve/main/ se convierten al
    formato de tag (colon), que es el único que acepta el FROM del Modelfile.
    """
    import re
    source = source.strip()
    for prefix in ("https://huggingface.co/", "http://huggingface.co/"):
        if source.startswith(prefix):
            path = source[len(prefix):]
            # /blob/branch/file  o  /resolve/branch/file  → :file
            m = re.match(r"^([^/]+/[^/]+)/(?:blob|resolve|raw)/[^/]+/(.+)$", path)
            if m:
                return f"hf.co/{m.group(1)}:{m.group(2)}"
            # URL de repo sin archivo
            m = re.match(r"^([^/]+/[^/]+)/?$", path)
            if m:
                return f"hf.co/{m.group(1)}"
            # Fallback: prefijo genérico
            return "hf.co/" + path
    return source


def _is_local_file(source: str) -> bool:
    return source.startswith("/") or source.startswith("~/")


def _calc_sha256_sync(path: Path) -> str:
    """Calcula SHA256 de un archivo en chunks de 4MB (no bloquea el event loop si se usa en thread)."""
    sha = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(4 * 1024 * 1024), b""):
            sha.update(chunk)
    return sha.hexdigest()


def _build_create_payload(name: str, source: str, template: str) -> dict:
    """Payload para /api/create (Ollama v0.24+) con modelo existente como base."""
    payload: dict = {"name": name, "from": source}
    if template and template != "auto" and template in _TEMPLATES:
        payload["template"] = _TEMPLATES[template]
    return payload


# ── Instalar modelo ────────────────────────────────────────────────────────────

class InstallModelRequest(BaseModel):
    name: str
    source: str
    template: str = "auto"
    base_url: str = ""


@router.post("/install")
async def install_model(req: InstallModelRequest):
    """Instala un modelo en Ollama. Responde SSE con progreso.

    HuggingFace : /api/pull → /api/copy al nombre elegido → /api/delete alias HF
    GGUF local  : SHA256 → blob upload si no existe → /api/create con 'files'
    Modelo Ollama existente: /api/create con 'from'
    """
    base_url = (req.base_url or OLLAMA_DEFAULT).rstrip("/")
    source = _parse_source(req.source)
    is_hf = source.startswith("hf.co/")
    is_local = not is_hf and _is_local_file(source)

    async def _ndjson_stream(client, method, url, payload):
        async with client.stream(method, url, json=payload) as resp:
            if resp.status_code >= 400:
                body = await resp.aread()
                try:
                    error = json.loads(body).get("error", body.decode())
                except Exception:
                    error = body.decode()
                yield json.dumps({"error": error})
                return
            async for line in resp.aiter_lines():
                if line:
                    yield line

    async def event_stream():
        try:
            async with httpx.AsyncClient(timeout=None) as client:

                # ── HuggingFace ───────────────────────────────────────────────
                if is_hf:
                    hf_name = source
                    error_found = False
                    async for line in _ndjson_stream(
                        client, "POST", f"{base_url}/api/pull",
                        {"model": hf_name, "stream": True},
                    ):
                        yield f"data: {line}\n\n"
                        try:
                            if json.loads(line).get("error"):
                                error_found = True
                                break
                        except Exception:
                            pass
                    if error_found:
                        return

                    if req.name and req.name != hf_name:
                        yield f'data: {json.dumps({"status": f"copiando a {req.name}..."})}\n\n'
                        cp = await client.post(
                            f"{base_url}/api/copy",
                            json={"source": hf_name, "destination": req.name},
                        )
                        if cp.status_code not in (200, 201):
                            yield f'data: {json.dumps({"error": f"copy falló: {cp.text}"})}\n\n'
                            return
                        await client.request(
                            "DELETE", f"{base_url}/api/delete",
                            json={"model": hf_name},
                        )

                    yield f'data: {json.dumps({"status": "success"})}\n\n'

                # ── GGUF local (blob upload) ───────────────────────────────────
                elif is_local:
                    path = Path(source).expanduser()

                    if not path.exists():
                        yield f'data: {json.dumps({"error": f"Archivo no encontrado: {path}"})}\n\n'
                        return
                    if not path.is_file():
                        yield f'data: {json.dumps({"error": f"La ruta no es un archivo: {path}"})}\n\n'
                        return

                    file_size = path.stat().st_size
                    filename = path.name

                    # 1) SHA256 en thread para no bloquear
                    yield f'data: {json.dumps({"status": f"calculando checksum de {filename}..."})}\n\n'
                    hex_digest = await asyncio.to_thread(_calc_sha256_sync, path)
                    digest = f"sha256:{hex_digest}"

                    # 2) ¿Blob ya existe en Ollama?
                    head = await client.head(f"{base_url}/api/blobs/{digest}")

                    if head.status_code == 200:
                        yield f'data: {json.dumps({"status": "blob ya en caché de Ollama, omitiendo subida"})}\n\n'
                    else:
                        # 3) Subir blob con progreso
                        mb = file_size // (1024 * 1024)
                        yield f'data: {json.dumps({"status": f"subiendo {filename} ({mb} MB)...", "completed": 0, "total": file_size})}\n\n'

                        progress = {"uploaded": 0}
                        upload_error: list[str] = []
                        upload_done = asyncio.Event()

                        def _file_reader():
                            with open(path, "rb") as f:
                                for chunk in iter(lambda: f.read(4 * 1024 * 1024), b""):
                                    progress["uploaded"] += len(chunk)
                                    yield chunk

                        async def _do_upload():
                            try:
                                def _sync():
                                    with httpx.Client(timeout=None) as sc:
                                        r = sc.post(
                                            f"{base_url}/api/blobs/{digest}",
                                            content=_file_reader(),
                                        )
                                        if r.status_code >= 400:
                                            upload_error.append(r.text)
                                await asyncio.to_thread(_sync)
                            except Exception as e:
                                upload_error.append(str(e))
                            finally:
                                upload_done.set()

                        task = asyncio.create_task(_do_upload())

                        while not upload_done.is_set():
                            await asyncio.sleep(1.0)
                            pct = int(progress["uploaded"] * 100 / file_size) if file_size else 100
                            yield f'data: {json.dumps({"status": f"subiendo... {pct}%", "completed": progress["uploaded"], "total": file_size})}\n\n'

                        await task

                        if upload_error:
                            yield f'data: {json.dumps({"error": f"Error subiendo blob: {upload_error[0]}"})}\n\n'
                            return

                    # 4) Crear modelo con files
                    yield f'data: {json.dumps({"status": "creando modelo..."})}\n\n'
                    payload: dict = {"name": req.name, "files": {filename: digest}}
                    if req.template and req.template != "auto" and req.template in _TEMPLATES:
                        payload["template"] = _TEMPLATES[req.template]

                    async for line in _ndjson_stream(client, "POST", f"{base_url}/api/create", payload):
                        yield f"data: {line}\n\n"

                # ── Modelo Ollama existente ───────────────────────────────────
                else:
                    payload = _build_create_payload(req.name, source, req.template)
                    async for line in _ndjson_stream(client, "POST", f"{base_url}/api/create", payload):
                        yield f"data: {line}\n\n"

        except httpx.ConnectError:
            yield f'data: {json.dumps({"error": "No se pudo conectar a Ollama"})}\n\n'
        except Exception as e:
            yield f'data: {json.dumps({"error": str(e)})}\n\n'

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Desinstalar modelo ─────────────────────────────────────────────────────────

class UninstallModelRequest(BaseModel):
    name: str
    base_url: str = ""


@router.delete("/uninstall")
async def uninstall_model(req: UninstallModelRequest):
    """Elimina un modelo de Ollama."""
    base_url = (req.base_url or OLLAMA_DEFAULT).rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.request(
                "DELETE", f"{base_url}/api/delete", json={"model": req.name}
            )
            if resp.status_code >= 400:
                try:
                    detail = resp.json().get("error", resp.text)
                except Exception:
                    detail = resp.text
                return {"ok": False, "error": detail}
        return {"ok": True}
    except httpx.ConnectError:
        return {"ok": False, "error": "No se pudo conectar a Ollama"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ── Purgar blobs huérfanos ────────────────────────────────────────────────────

@router.post("/blobs/purge")
async def purge_blobs():
    """Elimina blobs de ~/.ollama/models/blobs/ que no están referenciados
    por ningún manifiesto instalado. Respeta la variable OLLAMA_MODELS."""
    import os
    import json as _json
    from pathlib import Path

    ollama_dir = Path(os.environ.get("OLLAMA_MODELS", Path.home() / ".ollama" / "models"))
    blobs_dir = ollama_dir / "blobs"
    manifests_dir = ollama_dir / "manifests"

    if not blobs_dir.exists():
        return {"ok": False, "error": f"Directorio de blobs no encontrado: {blobs_dir}"}

    # Recolectar todos los digests referenciados en los manifiestos instalados
    referenced: set[str] = set()
    if manifests_dir.exists():
        for mf in manifests_dir.rglob("*"):
            if not mf.is_file():
                continue
            try:
                data = _json.loads(mf.read_text())
                if cfg := data.get("config"):
                    if d := cfg.get("digest"):
                        referenced.add(d.replace(":", "-"))
                for layer in data.get("layers") or []:
                    if d := layer.get("digest"):
                        referenced.add(d.replace(":", "-"))
            except Exception:
                pass

    # Borrar blobs que no están en ningún manifiesto
    deleted, freed_bytes, errors = 0, 0, []
    for blob in blobs_dir.iterdir():
        if not blob.is_file():
            continue
        if blob.name not in referenced:
            try:
                freed_bytes += blob.stat().st_size
                blob.unlink()
                deleted += 1
            except Exception as e:
                errors.append(f"{blob.name}: {e}")

    return {"ok": True, "deleted": deleted, "freed_bytes": freed_bytes, "errors": errors}


# ── OpenAI compat helper ───────────────────────────────────────────────────────

async def _list_openai_compat(base_url: str, api_key: Optional[str], api_base: str = "/v1") -> dict:
    host = base_url.rstrip("/")
    ab   = api_base.rstrip("/") if api_base else "/v1"
    headers = {}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    async with httpx.AsyncClient(timeout=8) as client:
        resp = await client.get(f"{host}{ab}/models", headers=headers)
        resp.raise_for_status()
        data = resp.json()
        models = [m["id"] for m in data.get("data", [])]
        return {"models": models, "provider": "openai_compat"}
