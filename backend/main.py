from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
from backend.api import api_router
from backend.api.ws import router as ws_router

app = FastAPI(title="Waifuku API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
app.include_router(ws_router)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}


# Servir frontend compilado en modo producción (release)
_dist = Path(__file__).parent.parent / "frontend" / "dist"
if _dist.exists():
    app.mount("/assets", StaticFiles(directory=_dist / "assets"), name="assets")

    @app.get("/")
    async def serve_root():
        return FileResponse(_dist / "index.html")

    @app.get("/{path:path}")
    async def serve_spa(path: str):
        file = _dist / path
        if file.exists() and file.is_file():
            return FileResponse(file)
        return FileResponse(_dist / "index.html")
