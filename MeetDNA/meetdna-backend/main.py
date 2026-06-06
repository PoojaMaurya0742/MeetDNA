from dotenv import load_dotenv
load_dotenv() 

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import (
    auth,
    briefing,
    extraction,
    meetings,
    memory,
    rag,
    summary,
    transcription,
    websocket,
)
from services.chroma_service import chroma_service

load_dotenv()

app = FastAPI(title="MeetDNA API", version="1.0.0")

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
allowed_origins = ["http://localhost:3000"]
if frontend_url not in allowed_origins:
    allowed_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(meetings.router, prefix="/api/meetings", tags=["Meetings"])
app.include_router(websocket.router, prefix="/ws", tags=["WebSocket"])
app.include_router(transcription.router, prefix="/api/transcription", tags=["Transcription"])
app.include_router(extraction.router, prefix="/api/extraction", tags=["Extraction"])
app.include_router(memory.router, prefix="/api/memory", tags=["Memory"])
app.include_router(rag.router, prefix="/api/rag", tags=["RAG"])
app.include_router(briefing.router, prefix="/api/briefing", tags=["Briefing"])
app.include_router(summary.router, prefix="/api/summary", tags=["Summary"])


@app.on_event("startup")
async def startup_event():
    chroma_service.ensure_collection()


@app.get("/health")
async def health():
    return {"status": "MeetDNA backend running"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
