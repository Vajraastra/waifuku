"""
Endpoints para gestión de modelos ML del agente.
  GET  /api/v1/agent/models           → estado de todos los modelos
  POST /api/v1/agent/models/{id}/download → descarga con progreso SSE
"""
import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from backend.models.manager import model_manager

router = APIRouter(prefix="/agent/models", tags=["agent-models"])


@router.get("")
def get_models_status():
    """Estado de todos los modelos: instalado, tamaño, auto_download."""
    return model_manager.get_status()


@router.post("/{model_id}/download")
async def download_model(model_id: str):
    """
    Inicia la descarga de un modelo y emite progreso como Server-Sent Events.
    El cliente lee el stream y actualiza su UI hasta recibir status=done o error.
    """
    async def event_stream():
        async for progress in model_manager.download(model_id):
            yield f"data: {json.dumps(progress, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":    "no-cache",
            "X-Accel-Buffering": "no",
            "Connection":       "keep-alive",
        },
    )
