from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api import api_router
from backend.api.ws import router as ws_router

app = FastAPI(title="Waifuku API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
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
