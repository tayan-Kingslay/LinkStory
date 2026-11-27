FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends git build-essential && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p /data
ENV LINKSTORY_CHAT_DB=/data/conversations.sqlite3
ENV LINKSTORY_CHROMA_DIR=/data/chroma
ENV HF_HOME=/data/models/hf
ENV LINKSTORY_TTS_CACHE=/data/models/tts
ENV LINKSTORY_MODELS_READY_FILE=/data/models/.ready
EXPOSE 8000
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
