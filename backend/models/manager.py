"""
ModelManager — descarga y verifica los modelos ML de Waifuku.
Los modelos van siempre a data/models/, nunca al sistema operativo.
"""
import logging
import os
import zipfile
import tempfile
from pathlib import Path
from typing import AsyncGenerator
import httpx

from backend.models.registry import MODEL_REGISTRY

log = logging.getLogger(__name__)


class ModelManager:

    def get_status(self) -> dict:
        """Estado de todos los modelos: instalado / falta / tamaño."""
        result = {}
        for model_id, info in MODEL_REGISTRY.items():
            path = Path(info["path"])
            if info.get("managed_by") == "open_clip":
                installed = (path / "open_clip_pytorch_model.bin").exists()
            else:
                installed = path.exists() and path.stat().st_size > 1_000
            result[model_id] = {
                "id":            model_id,
                "name":          info["name"],
                "size_mb":       info["size_mb"],
                "installed":     installed,
                "auto_download": info.get("auto_download", False),
                "required_by":   info.get("required_by", []),
            }
        return result

    def check_missing(self, model_ids: list[str]) -> list[dict]:
        """Retorna la lista de modelos de model_ids que no están instalados."""
        status = self.get_status()
        return [status[mid] for mid in model_ids if mid in status and not status[mid]["installed"]]

    async def download(self, model_id: str) -> AsyncGenerator[dict, None]:
        """
        Descarga un modelo y emite dicts de progreso.
        Formato: {"status": "downloading"|"done"|"error", ...}
        """
        info = MODEL_REGISTRY.get(model_id)
        if not info:
            yield {"status": "error", "message": f"Modelo desconocido: {model_id}"}
            return

        if info.get("managed_by") == "open_clip":
            yield {"status": "error", "message": "Modelo CLIP se descarga al primer uso por open_clip"}
            return

        url = info.get("url")
        if not url:
            yield {"status": "error", "message": "No hay URL de descarga para este modelo"}
            return

        path = Path(info["path"])
        path.parent.mkdir(parents=True, exist_ok=True)

        zip_member = info.get("zip_extract")  # e.g. "buffalo_l/w600k_r50.onnx"
        # Si es ZIP, descargamos a un archivo temporal; si no, directo al destino
        if zip_member:
            fd, tmp = tempfile.mkstemp(suffix=".zip")
            os.close(fd)
            download_target = Path(tmp)
        else:
            download_target = path

        log.info(f"Descargando modelo {model_id} desde {url}")

        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=None) as client:
                async with client.stream("GET", url) as response:
                    response.raise_for_status()
                    total = int(response.headers.get("content-length", 0))
                    downloaded = 0

                    with open(download_target, "wb") as f:
                        async for chunk in response.aiter_bytes(chunk_size=65_536):
                            f.write(chunk)
                            downloaded += len(chunk)
                            progress = (downloaded / total) if total else 0
                            yield {
                                "status":        "downloading",
                                "model_id":      model_id,
                                "progress":      round(progress, 4),
                                "downloaded_mb": round(downloaded / 1_000_000, 1),
                                "total_mb":      round(total / 1_000_000, 1),
                            }

        except Exception as e:
            download_target.unlink(missing_ok=True)
            log.error(f"Error descargando {model_id}: {e}")
            yield {"status": "error", "message": str(e), "model_id": model_id}
            return

        # Extracción ZIP si aplica
        if zip_member:
            yield {"status": "extracting", "model_id": model_id}
            try:
                with zipfile.ZipFile(download_target) as zf:
                    member_names = zf.namelist()
                    if zip_member not in member_names:
                        raise FileNotFoundError(
                            f"'{zip_member}' no encontrado en el ZIP. "
                            f"Contenido: {member_names[:10]}"
                        )
                    with zf.open(zip_member) as src, open(path, "wb") as dst:
                        dst.write(src.read())
            except Exception as e:
                path.unlink(missing_ok=True)
                log.error(f"Error extrayendo {zip_member} de ZIP para {model_id}: {e}")
                yield {"status": "error", "message": str(e), "model_id": model_id}
                return
            finally:
                download_target.unlink(missing_ok=True)
            log.info(f"Extraído {zip_member} → {path}")

        log.info(f"Modelo {model_id} descargado correctamente")
        yield {"status": "done", "model_id": model_id}

    async def auto_download_small(self, model_ids: list[str]) -> None:
        """Descarga silenciosamente los modelos marcados como auto_download=True."""
        for model_id in model_ids:
            info = MODEL_REGISTRY.get(model_id)
            if not info or not info.get("auto_download"):
                continue
            path = Path(info["path"])
            if path.exists() and path.stat().st_size > 1_000:
                continue
            log.info(f"Auto-descargando modelo pequeño: {model_id}")
            async for _ in self.download(model_id):
                pass


model_manager = ModelManager()
