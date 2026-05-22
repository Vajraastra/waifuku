"""
Stats de hardware del sistema host: RAM y GPU VRAM.
Lee directamente del OS — independiente del provider LLM activo.

GPU: intenta nvidia-smi (NVIDIA), luego rocm-smi (AMD), luego pynvml.
RAM: usa psutil si está instalado, fallback a /proc/meminfo en Linux.
"""
import asyncio
import json
import subprocess
from fastapi import APIRouter

router = APIRouter(prefix="/system", tags=["system"])


def _nvidia_smi() -> list[dict]:
    """Lee stats GPU vía nvidia-smi. Devuelve lista vacía si no disponible."""
    try:
        result = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=index,name,memory.total,memory.used,memory.free",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True, text=True, timeout=3,
        )
        if result.returncode != 0:
            return []
        gpus = []
        for line in result.stdout.strip().splitlines():
            parts = [p.strip() for p in line.split(",")]
            if len(parts) < 5:
                continue
            idx, name, total, used, free = parts[:5]
            gpus.append({
                "index":      int(idx),
                "name":       name,
                "vram_total": int(total) * 1024 * 1024,  # MiB → bytes
                "vram_used":  int(used)  * 1024 * 1024,
                "vram_free":  int(free)  * 1024 * 1024,
                "vendor":     "nvidia",
            })
        return gpus
    except Exception:
        return []


def _rocm_smi() -> list[dict]:
    """Lee stats GPU vía rocm-smi (AMD). Devuelve lista vacía si no disponible."""
    try:
        result = subprocess.run(
            ["rocm-smi", "--showmeminfo", "vram", "--json"],
            capture_output=True, text=True, timeout=3,
        )
        if result.returncode != 0:
            return []
        data = json.loads(result.stdout)
        gpus = []
        for key, val in data.items():
            if not key.startswith("card"):
                continue
            vram_total = int(val.get("VRAM Total Memory (B)", 0))
            vram_used  = int(val.get("VRAM Total Used Memory (B)", 0))
            gpus.append({
                "index":      len(gpus),
                "name":       val.get("Card Series", key),
                "vram_total": vram_total,
                "vram_used":  vram_used,
                "vram_free":  vram_total - vram_used,
                "vendor":     "amd",
            })
        return gpus
    except Exception:
        return []


def _pynvml() -> list[dict]:
    """Fallback pynvml si está instalado."""
    try:
        import pynvml  # type: ignore
        pynvml.nvmlInit()
        count = pynvml.nvmlDeviceGetCount()
        gpus = []
        for i in range(count):
            h    = pynvml.nvmlDeviceGetHandleByIndex(i)
            name = pynvml.nvmlDeviceGetName(h)
            mem  = pynvml.nvmlDeviceGetMemoryInfo(h)
            gpus.append({
                "index":      i,
                "name":       name if isinstance(name, str) else name.decode(),
                "vram_total": mem.total,
                "vram_used":  mem.used,
                "vram_free":  mem.free,
                "vendor":     "nvidia",
            })
        return gpus
    except Exception:
        return []


def _ram_psutil() -> dict | None:
    try:
        import psutil  # type: ignore
        m = psutil.virtual_memory()
        return {
            "ram_total": m.total,
            "ram_used":  m.used,
            "ram_free":  m.available,
        }
    except Exception:
        return None


def _ram_proc() -> dict | None:
    """/proc/meminfo fallback (Linux)."""
    try:
        data: dict[str, int] = {}
        with open("/proc/meminfo") as f:
            for line in f:
                parts = line.split()
                if len(parts) >= 2:
                    key = parts[0].rstrip(":")
                    val = int(parts[1]) * 1024   # kB → bytes
                    data[key] = val
        total     = data.get("MemTotal", 0)
        free      = data.get("MemAvailable", data.get("MemFree", 0))
        return {
            "ram_total": total,
            "ram_used":  total - free,
            "ram_free":  free,
        }
    except Exception:
        return None


@router.get("/stats")
async def system_stats():
    """
    Stats de hardware del host: GPU VRAM + RAM del sistema.
    Respuesta:
      {
        "gpus": [{"index", "name", "vendor", "vram_total", "vram_used", "vram_free"}],
        "ram":  {"ram_total", "ram_used", "ram_free"}   // null si no disponible
      }
    """
    # Ejecutar en threadpool para no bloquear el event loop con subprocesos
    loop = asyncio.get_event_loop()

    gpus, ram = await asyncio.gather(
        loop.run_in_executor(None, lambda: _nvidia_smi() or _rocm_smi() or _pynvml()),
        loop.run_in_executor(None, lambda: _ram_psutil() or _ram_proc()),
    )

    return {"gpus": gpus, "ram": ram}
