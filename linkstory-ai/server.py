"""Authenticated HTTP API for the self-hosted LinkStory AI core.

The browser sends the signed-in user's Supabase access token. This service
validates it against Supabase Auth and scopes every conversation to that user.
Ollama and Chroma must remain private to the inference host.
"""
from __future__ import annotations

import logging
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator, Optional
from uuid import UUID, uuid4

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from core import answer_question, OLLAMA_BASE_URL, CHAT_MODEL, PERSIST_DIR

ROOT = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv("LINKSTORY_CHAT_DB", ROOT / "data" / "conversations.sqlite3"))
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_PUBLISHABLE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")
MAX_HISTORY = 20
MAX_REQUESTS_PER_MINUTE = 20

app = FastAPI(title="LinkStory AI", version="0.2.0")

allowed_origins = [
    origin.strip()
    for origin in os.getenv("LINKSTORY_ALLOWED_ORIGINS", "https://linkstorysite.vercel.app").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    conversation_id: str
    sources: list[dict]


@contextmanager
def db() -> Iterator[sqlite3.Connection]:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=15)
    try:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                user_id TEXT,
                role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
                content TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)
        columns = {row[1] for row in conn.execute("PRAGMA table_info(messages)")}
        if "user_id" not in columns:
            conn.execute("ALTER TABLE messages ADD COLUMN user_id TEXT")
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_messages_owner_conversation "
            "ON messages(user_id, conversation_id, id)"
        )
        conn.execute("""
            CREATE TABLE IF NOT EXISTS request_limits (
                user_id TEXT NOT NULL,
                window_start INTEGER NOT NULL,
                request_count INTEGER NOT NULL,
                PRIMARY KEY(user_id, window_start)
            )
        """)
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def get_current_user(authorization: Optional[str] = Header(default=None)) -> str:
    if not SUPABASE_URL or not SUPABASE_PUBLISHABLE_KEY:
        raise HTTPException(status_code=503, detail="Autenticação da LinkStory AI ainda não foi configurada.")
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=401, detail="Entre na sua conta LinkStory para conversar.")
    try:
        response = httpx.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "apikey": SUPABASE_PUBLISHABLE_KEY,
                "Authorization": f"Bearer {token.strip()}",
            },
            timeout=8.0,
        )
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="Não foi possível validar sua sessão agora.")
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Sua sessão expirou. Entre novamente.")
    try:
        user_id = str(UUID(response.json()["id"]))
    except (ValueError, KeyError, TypeError):
        raise HTTPException(status_code=401, detail="Sessão LinkStory inválida.")
    return user_id


def enforce_rate_limit(user_id: str) -> None:
    import time
    window = int(time.time()) // 60
    with db() as conn:
        conn.execute(
            "INSERT INTO request_limits(user_id, window_start, request_count) VALUES (?, ?, 1) "
            "ON CONFLICT(user_id, window_start) DO UPDATE SET request_count=request_count+1",
            (user_id, window),
        )
        count = conn.execute(
            "SELECT request_count FROM request_limits WHERE user_id=? AND window_start=?",
            (user_id, window),
        ).fetchone()[0]
        conn.execute("DELETE FROM request_limits WHERE window_start < ?", (window - 2,))
    if count > MAX_REQUESTS_PER_MINUTE:
        raise HTTPException(status_code=429, detail="Você enviou muitas mensagens. Aguarde um minuto.")


@app.get("/health")
def health():
    ollama_ok = False
    try:
        response = httpx.get(f"{OLLAMA_BASE_URL.rstrip('/')}/api/tags", timeout=2.5)
        ollama_ok = response.status_code == 200
    except httpx.HTTPError:
        pass
    ready = bool(SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY and ollama_ok and PERSIST_DIR.exists())
    return {
        "status": "ready" if ready else "not_ready",
        "engine": "ollama",
        "model": CHAT_MODEL,
        "authentication_configured": bool(SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY),
        "ollama_reachable": ollama_ok,
        "knowledge_base_ready": PERSIST_DIR.exists(),
    }


@app.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest, user_id: str = Depends(get_current_user)):
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=422, detail="A mensagem não pode estar vazia.")
    enforce_rate_limit(user_id)

    if payload.conversation_id:
        try:
            conversation_id = str(UUID(payload.conversation_id))
        except ValueError:
            raise HTTPException(status_code=400, detail="conversation_id inválido.")
    else:
        conversation_id = str(uuid4())

    try:
        with db() as conn:
            previous = conn.execute(
                "SELECT role, content FROM messages "
                "WHERE user_id=? AND conversation_id=? ORDER BY id DESC LIMIT ?",
                (user_id, conversation_id, MAX_HISTORY),
            ).fetchall()
        previous.reverse()
        history = "\\n".join(f"{role}: {content}" for role, content in previous)
        enriched_question = (
            f"CONTEXTO DA CONVERSA ANTERIOR (use apenas se relevante):\\n{history}\\n\\n"
            f"NOVA MENSAGEM DO USUÁRIO:\\n{message}"
            if history else message
        )
        result = answer_question(enriched_question)
        answer = str(result.get("answer", "")).strip()
        if not answer:
            raise RuntimeError("O modelo não retornou uma resposta.")
        with db() as conn:
            conn.executemany(
                "INSERT INTO messages(conversation_id, user_id, role, content) VALUES (?, ?, ?, ?)",
                [
                    (conversation_id, user_id, "user", message),
                    (conversation_id, user_id, "assistant", answer),
                ],
            )
        return ChatResponse(
            answer=answer,
            conversation_id=conversation_id,
            sources=result.get("sources", []),
        )
    except HTTPException:
        raise
    except Exception:
        logging.exception("LinkStory AI inference failed")
        raise HTTPException(status_code=503, detail="A inteligência está indisponível no momento.")


@app.get("/conversations/{conversation_id}")
def get_conversation(conversation_id: str, user_id: str = Depends(get_current_user)):
    try:
        conversation_id = str(UUID(conversation_id))
    except ValueError:
        raise HTTPException(status_code=400, detail="conversation_id inválido.")
    with db() as conn:
        rows = conn.execute(
            "SELECT role, content, created_at FROM messages "
            "WHERE user_id=? AND conversation_id=? ORDER BY id",
            (user_id, conversation_id),
        ).fetchall()
    if not rows:
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")
    return {
        "conversation_id": conversation_id,
        "messages": [
            {"role": role, "content": content, "created_at": created_at}
            for role, content, created_at in rows
        ],
    }
