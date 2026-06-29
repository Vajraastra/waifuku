"""
Catálogo de modelos ML que Waifuku puede descargar y gestionar.
Cada entrada declara dónde está, cuánto pesa y si se descarga automáticamente.

URLs verificadas el 2026-05-23:
  - yunet:              ✅ HuggingFace opencv (0.23 MB, INT8 disponible)
  - lbpcascade_animeface: ✅ GitHub nagadomi (0.24 MB)
  - arcface_w600k:      ✅ HuggingFace richarrrddd/w600k_r50_v1 (174 MB)
                          ⚠ deepinsight/insightface devuelve 401 — mirror usado
  - clip_vit_b32:       gestionado por open_clip (~340 MB, descarga automática al primer uso)
"""
from pathlib import Path

# Anclado a la raíz del proyecto (no al CWD): backend/models/registry.py → ../../.. = raíz
_BASE = Path(__file__).resolve().parent.parent.parent / "data" / "models"

MODEL_REGISTRY: dict = {
    "yunet": {
        "id":            "yunet",
        "name":          "YuNet Face Detector",
        "filename":      "face_detection_yunet_2023mar_int8.onnx",
        "path":          _BASE / "onnx" / "face_detection_yunet_2023mar_int8.onnx",
        # INT8: 100 KB vs 230 KB FP32. Suficiente para detección en pipeline con ArcFace.
        "url":           "https://huggingface.co/opencv/face_detection_yunet/resolve/main/face_detection_yunet_2023mar_int8.onnx",
        "size_mb":       0.1,
        "auto_download": True,
        "required_by":   ["vision_filter"],
    },
    "lbpcascade_animeface": {
        "id":            "lbpcascade_animeface",
        "name":          "Anime Face Cascade",
        "filename":      "lbpcascade_animeface.xml",
        "path":          _BASE / "onnx" / "lbpcascade_animeface.xml",
        "url":           "https://raw.githubusercontent.com/nagadomi/lbpcascade_animeface/master/lbpcascade_animeface.xml",
        "size_mb":       0.24,
        "auto_download": True,
        "required_by":   ["vision_filter"],
    },
    "arcface_w600k": {
        "id":            "arcface_w600k",
        "name":          "ArcFace Recognition (w600k-r50)",
        "filename":      "w600k_r50.onnx",
        "path":          _BASE / "onnx" / "w600k_r50.onnx",
        # Fuente oficial: GitHub Releases de deepinsight/insightface.
        # Es un ZIP (buffalo_l.zip, ~288 MB) que contiene varios modelos;
        # el manager extrae solo w600k_r50.onnx y borra el ZIP.
        # deepinsight/insightface en HuggingFace devuelve 401 sin auth.
        # richarrrddd/w600k_r50_v1 rechazado: cuenta sin historial, 0 descargas.
        "url":           "https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_l.zip",
        "zip_extract":   "buffalo_l/w600k_r50.onnx",   # ruta dentro del ZIP
        "size_mb":       288,                            # tamaño del ZIP a descargar
        "auto_download": False,
        "required_by":   ["vision_filter"],
    },
    "clip_vit_b32": {
        "id":            "clip_vit_b32",
        "name":          "CLIP ViT-B/32",
        "filename":      "ViT-B-32",
        "path":          _BASE / "clip",
        "url":           None,
        "size_mb":       340,
        "auto_download": False,
        "managed_by":    "open_clip",
        "required_by":   ["vision_filter"],
    },
}
