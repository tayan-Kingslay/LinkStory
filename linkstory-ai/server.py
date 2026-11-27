"""HTTP API for the self-hosted LinkStory AI core.

Run with:
  LINKSTORY_API_TOKEN='...' uvicorn server:app --host 0.0.0.0 --port 8000

The Ollama service and Chroma database remain private to the inference host.
"""
from __future__ import annotations

import os
import secrets
import sqlite3
from pathlib import Path
from typing import Optional
from uuid import UUID

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from core import answer_question, OLLAMA_BASE_URL, CHAT_MODEL, PERSIST_DIR

ROOT = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv("LINKSTORY_CHAT_DB", ROOT / "data" / "conversations.sqlite3"))
API_TOKEN = os.getenv("LINKSTORY_API_TOKEN", "")
MAX_HISTORY = 20

app = FastAPI(title="LinkStory AI", version="0.1.0")

allowed_origins = [
    origin.strip()
    for origin in os.getenv("LINKSTORY_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]
if allowed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type"],
    )


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    conversation_id: str
    sources: list[dict]


def db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
            content TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, id)")
    return conn


def authorize(authorization: Optional[str] = Header(default=None)) -> None:
    # Never expose an unauthenticated public endpoint by accident.
    if not API_TOKEN:
        raise HTTPException(status_code=503, detail="LinkStory AI API ainda não foi configurada.")
    supplied = authorization[7:] if authorization and authorization.startswith("Bearer ") else ""
    if not secrets.compare_digest(supplied, API_TOKEN):
        raise HTTPException(status_code=401, detail="Não autorizado.")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "engine": "ollama",
        "model": CHAT_MODEL,
        "knowledge_base_ready": PERSIST_DIR.exists(),
    }


@app.post("/chat", response_model=ChatResponse, dependencies=[Depends(authorize)])
def chat(payload: ChatRequest):
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=422, detail="A mensagem não pode estar vazia.")

    conversation_id = payload.conversation_id
    if conversation_id:
        try:
            conversation_id = str(UUID(conversation_id))
        except ValueError:
            raise HTTPException(status_code=400, detail="conversation_id inválido.")
    else:
        from uuid import uuid4
        conversation_id = str(uuid4())

    try:
        with db() as conn:
            previous = conn.execute(
                "SELECT role, content FROM messages WHERE conversation_id=? ORDER BY id DESC LIMIT ?",
                (conversation_id, MAX_HISTORY),
            ).fetchall()
            previous.reverse()
            history = "\n".join(f"{role}: {content}" for role, content in previous)
            enriched_question = (
                f"CONTEXTO DA CONVERSA ANTERIOR (use apenas se relevante):\n{history}\n\n"
                f"NOVA MENSAGEM DO USUÁRIO:\n{message}"
                if history else message
            )
            result = answer_question(enriched_question)
            answer = str(result.get("answer", "")).strip()
            if not answer:
                raise RuntimeError("O modelo não retornou uma resposta.")
            conn.execute(
                "INSERT INTO messages(conversation_id, role, content) VALUES (?, 'user', ?)",
                (conversation_id, message),
            )
            conn.execute(
                "INSERT INTO messages(conversation_id, role, content) VALUES (?, 'assistant', ?)",
                (conversation_id, answer),
            )
        return ChatResponse(
            answer=answer,
            conversation_id=conversation_id,
            sources=result.get("sources", []),
        )
    except HTTPException:
        raise
    except Exception:
        # Detailed errors belong in private server logs, never in public responses.
        import logging
        logging.exception("LinkStory AI inference failed")
        raise HTTPException(status_code=503, detail="A inteligência está indisponível no momento.")


@app.get("/conversations/{conversation_id}", dependencies=[Depends(authorize)])
def get_conversation(conversation_id: str):
    try:
        conversation_id = str(UUID(conversation_id))
    except ValueError:
        raise HTTPException(status_code=400, detail="conversation_id inválido.")
    with db() as conn:
        rows = conn.execute(
            "SELECT role, content, created_at FROM messages WHERE conversation_id=? ORDER BY id",
            (conversation_id,),
        ).fetchall()
    return {
        "conversation_id": conversation_id,
        "messages": [
            {"role": role, "content": content, "created_at": created_at}
            for role, content, created_at in rows
        ],
    }
