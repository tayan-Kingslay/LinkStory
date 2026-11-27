"""Authenticated HTTP API for the self-hosted LinkStory AI core."""
from __future__ import annotations

import base64
import io
import json
import logging
import wave
import tempfile
from functools import lru_cache
import os
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator, Literal, Optional
from uuid import UUID, uuid4

import httpx
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from core import (
    answer_question,
    vector_store,
    OLLAMA_BASE_URL,
    CHAT_MODEL,
    EMBED_MODEL,
    PERSIST_DIR,
)

ROOT = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv("LINKSTORY_CHAT_DB", ROOT / "data" / "conversations.sqlite3"))
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_PUBLISHABLE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")
MAX_HISTORY = 20
MAX_REQUESTS_PER_MINUTE = 20
MAX_AUDIO_BYTES = 20 * 1024 * 1024
TTS_MODEL_REPO = os.getenv('LINKSTORY_TTS_MODEL_REPO', 'eraldohug/Paradee-8M-PtBr')
TTS_CACHE_DIR = Path(os.getenv('LINKSTORY_TTS_CACHE', ROOT / 'data' / 'models'))
WHISPER_MODEL_SIZE = os.getenv('LINKSTORY_WHISPER_MODEL', 'base')

app = FastAPI(title="LinkStory AI", version="0.2.1")

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
    expose_headers=["X-LinkStory-Word-Timings", "X-LinkStory-Voice"],
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
        return str(UUID(response.json()["id"]))
    except (ValueError, KeyError, TypeError):
        raise HTTPException(status_code=401, detail="Sessão LinkStory inválida.")


def enforce_rate_limit(user_id: str) -> None:
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
    tags = []
    ollama_ok = False
    try:
        response = httpx.get(f"{OLLAMA_BASE_URL.rstrip('/')}/api/tags", timeout=2.5)
        if response.status_code == 200:
            ollama_ok = True
            tags = [item.get("name", "") for item in response.json().get("models", [])]
    except (httpx.HTTPError, ValueError, TypeError):
        pass

    chat_model_ready = CHAT_MODEL in tags
    embedding_model_ready = EMBED_MODEL in tags
    knowledge_base_ready = False
    if PERSIST_DIR.exists():
        try:
            knowledge_base_ready = vector_store()._collection.count() > 0
        except Exception:
            knowledge_base_ready = False

    auth_ready = bool(SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY)
    ready = auth_ready and ollama_ok and chat_model_ready and embedding_model_ready and knowledge_base_ready
    return {
        "status": "ready" if ready else "not_ready",
        "engine": "ollama",
        "authentication_configured": auth_ready,
        "ollama_reachable": ollama_ok,
        "chat_model_ready": chat_model_ready,
        "embedding_model_ready": embedding_model_ready,
        "knowledge_base_ready": knowledge_base_ready,
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


@lru_cache(maxsize=1)
def transcription_model():
    from faster_whisper import WhisperModel
    return WhisperModel(
        WHISPER_MODEL_SIZE,
        device="cpu",
        compute_type="int8",
        cpu_threads=max(1, int(os.getenv("LINKSTORY_WHISPER_THREADS", "4"))),
    )


class SpeechRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2500)
    voice: Literal["pf_dora", "pm_alex"] = "pf_dora"


@lru_cache(maxsize=2)
def speech_model(voice: str):
    from huggingface_hub import hf_hub_download
    from paradee import Paradee

    TTS_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    model_name = "onnx/paradee_dora_int8.onnx" if voice == "pf_dora" else "onnx/paradee_alex_int8.onnx"
    model_path = hf_hub_download(
        repo_id=TTS_MODEL_REPO,
        filename=model_name,
        cache_dir=str(TTS_CACHE_DIR),
    )
    config_path = hf_hub_download(
        repo_id=TTS_MODEL_REPO,
        filename="config.json",
        cache_dir=str(TTS_CACHE_DIR),
    )
    return Paradee(
        model_path=model_path,
        config_path=config_path,
        lang="pt",
        voices=[voice],
        threads=max(1, int(os.getenv("LINKSTORY_TTS_THREADS", "2"))),
    )


@app.post("/speak")
def speak(payload: SpeechRequest, user_id: str = Depends(get_current_user)):
    enforce_rate_limit(user_id)
    try:
        import numpy as np

        audio, words = speech_model(payload.voice).with_timestamps(
            payload.text.strip(),
            voice=payload.voice,
        )
        if audio is None or len(audio) == 0:
            raise ValueError("O sintetizador não gerou áudio.")
        pcm = (np.clip(audio, -1.0, 1.0) * 32767).astype("<i2").tobytes()
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(24000)
            wav.writeframes(pcm)
        timings = base64.urlsafe_b64encode(
            json.dumps(words, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        ).decode("ascii")
        return Response(
            content=buffer.getvalue(),
            media_type="audio/wav",
            headers={
                "X-LinkStory-Word-Timings": timings,
                "X-LinkStory-Voice": payload.voice,
                "Cache-Control": "no-store",
            },
        )
    except Exception:
        logging.exception("LinkStory AI speech synthesis failed")
        raise HTTPException(status_code=503, detail="A voz da LinkStory AI está indisponível no momento.")


@app.post("/transcribe")
def transcribe_audio(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    enforce_rate_limit(user_id)
    allowed_types = {
        "audio/webm": ".webm",
        "audio/mp4": ".mp4",
        "audio/mpeg": ".mp3",
        "audio/wav": ".wav",
        "audio/x-wav": ".wav",
        "audio/ogg": ".ogg",
    }
    suffix = allowed_types.get((file.content_type or "").lower())
    if not suffix:
        raise HTTPException(status_code=415, detail="Formato de áudio não suportado.")
    audio = file.file.read(MAX_AUDIO_BYTES + 1)
    if not audio:
        raise HTTPException(status_code=422, detail="O arquivo de áudio está vazio.")
    if len(audio) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="O áudio ultrapassa o limite de 20 MB.")

    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(prefix="linkstory-audio-", suffix=suffix, delete=False) as temp:
            temp.write(audio)
            temp_path = temp.name
        model = transcription_model()
        segments, info = model.transcribe(
            temp_path,
            language="pt",
            beam_size=5,
            vad_filter=True,
        )
        transcript = " ".join(segment.text.strip() for segment in segments).strip()
        return {
            "text": transcript,
            "language": info.language,
            "language_probability": round(float(info.language_probability), 4),
        }
    except HTTPException:
        raise
    except Exception:
        logging.exception("LinkStory AI transcription failed")
        raise HTTPException(status_code=503, detail="Não foi possível transcrever o áudio agora.")
    finally:
        file.file.close()
        if temp_path:
            try:
                os.unlink(temp_path)
            except OSError:
                logging.warning("Temporary audio cleanup failed")


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
