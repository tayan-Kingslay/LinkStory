import uuid

from fastapi.testclient import TestClient


def setup_client(monkeypatch, tmp_path):
    import server

    monkeypatch.setattr(server, "DB_PATH", tmp_path / "test.sqlite3")
    server.app.dependency_overrides[server.get_current_user] = lambda: str(uuid.UUID(int=1))
    monkeypatch.setattr(server, "answer_question", lambda prompt: {
        "answer": "Resposta simulada.",
        "sources": [{"file": "README.md", "line": 1}],
    })
    return server, TestClient(server.app)


def teardown(server):
    server.app.dependency_overrides.clear()


def test_chat_persists_history_for_authenticated_owner(monkeypatch, tmp_path):
    server, client = setup_client(monkeypatch, tmp_path)
    try:
        response = client.post("/chat", json={"message": "Olá"})
        assert response.status_code == 200
        data = response.json()
        assert data["answer"] == "Resposta simulada."
        assert data["conversation_id"]

        history = client.get(f"/conversations/{data['conversation_id']}")
        assert history.status_code == 200
        assert [m["role"] for m in history.json()["messages"]] == ["user", "assistant"]
    finally:
        teardown(server)


def test_conversation_is_not_visible_to_another_user(monkeypatch, tmp_path):
    server, client = setup_client(monkeypatch, tmp_path)
    try:
        response = client.post("/chat", json={"message": "Segredo"})
        conversation_id = response.json()["conversation_id"]

        server.app.dependency_overrides[server.get_current_user] = lambda: str(uuid.UUID(int=2))
        history = client.get(f"/conversations/{conversation_id}")
        assert history.status_code == 404
    finally:
        teardown(server)


def test_invalid_conversation_id_is_rejected(monkeypatch, tmp_path):
    server, client = setup_client(monkeypatch, tmp_path)
    try:
        response = client.get("/conversations/not-a-uuid")
        assert response.status_code == 400
    finally:
        teardown(server)


def test_empty_message_is_rejected(monkeypatch, tmp_path):
    server, client = setup_client(monkeypatch, tmp_path)
    try:
        response = client.post("/chat", json={"message": "   "})
        assert response.status_code == 422
    finally:
        teardown(server)


def test_transcription_uses_local_model_and_returns_text(monkeypatch, tmp_path):
    from types import SimpleNamespace

    server, client = setup_client(monkeypatch, tmp_path)
    class FakeModel:
        def transcribe(self, path, **kwargs):
            assert kwargs["language"] == "pt"
            return iter([SimpleNamespace(text=" Olá, LinkStory! ")]), SimpleNamespace(
                language="pt",
                language_probability=0.99,
            )

    monkeypatch.setattr(server, "transcription_model", lambda: FakeModel())
    try:
        response = client.post(
            "/transcribe",
            files={"file": ("sample.webm", b"fake-audio", "audio/webm")},
        )
        assert response.status_code == 200
        assert response.json()["text"] == "Olá, LinkStory!"
        assert response.json()["language"] == "pt"
    finally:
        teardown(server)


def test_transcription_rejects_unsupported_format(monkeypatch, tmp_path):
    server, client = setup_client(monkeypatch, tmp_path)
    try:
        response = client.post(
            "/transcribe",
            files={"file": ("sample.txt", b"not-audio", "text/plain")},
        )
        assert response.status_code == 415
    finally:
        teardown(server)


def test_speech_returns_wav_and_word_timings(monkeypatch, tmp_path):
    import numpy as np

    server, client = setup_client(monkeypatch, tmp_path)
    class FakeSpeechModel:
        def with_timestamps(self, text, voice):
            assert text == "Olá!"
            assert voice == "pf_dora"
            return np.array([0.0, 0.2, -0.2], dtype=np.float32), [("Olá", 0.0, 0.5)]

    monkeypatch.setattr(server, "speech_model", lambda voice: FakeSpeechModel())
    try:
        response = client.post("/speak", json={"text": "Olá!", "voice": "pf_dora"})
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("audio/wav")
        assert response.content[:4] == b"RIFF"
        assert response.headers["x-linkstory-voice"] == "pf_dora"
        assert response.headers["x-linkstory-word-timings"]
    finally:
        teardown(server)


def test_speech_rejects_unknown_voice(monkeypatch, tmp_path):
    server, client = setup_client(monkeypatch, tmp_path)
    try:
        response = client.post("/speak", json={"text": "Olá!", "voice": "unknown"})
        assert response.status_code == 422
    finally:
        teardown(server)


def test_supabase_auth_resolves_identity_from_verified_token(monkeypatch):
    import server

    expected = str(uuid.UUID(int=7))
    class FakeResponse:
        status_code = 200
        def json(self):
            return {"id": expected}

    monkeypatch.setattr(server, "SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setattr(server, "SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test")
    monkeypatch.setattr(server.httpx, "get", lambda *args, **kwargs: FakeResponse())
    assert server.get_current_user("Bearer valid-session-token") == expected


def test_supabase_auth_rejects_invalid_session(monkeypatch):
    import server
    from fastapi import HTTPException

    class FakeResponse:
        status_code = 401
        def json(self):
            return {}

    monkeypatch.setattr(server, "SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setattr(server, "SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test")
    monkeypatch.setattr(server.httpx, "get", lambda *args, **kwargs: FakeResponse())
    try:
        server.get_current_user("Bearer expired-token")
        assert False, "Expected invalid session to be rejected"
    except HTTPException as exc:
        assert exc.status_code == 401


def test_memories_are_private_to_each_user(monkeypatch, tmp_path):
    server, client = setup_client(monkeypatch, tmp_path)
    try:
        saved = client.post("/memories", json={"content": "Prefiro respostas curtas."})
        assert saved.status_code == 200
        memory_id = saved.json()["id"]
        assert client.get("/memories").json()["memories"][0]["content"] == "Prefiro respostas curtas."

        server.app.dependency_overrides[server.get_current_user] = lambda: str(uuid.UUID(int=2))
        assert client.get("/memories").json()["memories"] == []
        assert client.delete(f"/memories/{memory_id}").status_code == 404
    finally:
        teardown(server)


def test_saved_memory_is_added_to_chat_context(monkeypatch, tmp_path):
    server, client = setup_client(monkeypatch, tmp_path)
    captured = []
    monkeypatch.setattr(server, "answer_question", lambda prompt: (
        captured.append(prompt) or {"answer": "Entendido.", "sources": []}
    ))
    try:
        saved = client.post("/memories", json={"content": "Meu projeto se chama LinkStory."})
        assert saved.status_code == 200
        response = client.post("/chat", json={"message": "Qual é o nome do meu projeto?"})
        assert response.status_code == 200
        assert "MEMÓRIAS SALVAS PELO USUÁRIO" in captured[0]
        assert "Meu projeto se chama LinkStory." in captured[0]
    finally:
        teardown(server)

def test_user_can_edit_only_their_own_memory(monkeypatch, tmp_path):
    server, client = setup_client(monkeypatch, tmp_path)
    try:
        saved = client.post("/memories", json={"content": "Nome antigo."})
        memory_id = saved.json()["id"]
        edited = client.put(f"/memories/{memory_id}", json={"content": "Nome atualizado."})
        assert edited.status_code == 200
        assert edited.json()["content"] == "Nome atualizado."

        server.app.dependency_overrides[server.get_current_user] = lambda: str(uuid.UUID(int=2))
        forbidden = client.put(f"/memories/{memory_id}", json={"content": "Tentativa."})
        assert forbidden.status_code == 404
    finally:
        teardown(server)


def test_memory_can_be_disabled_and_is_not_added_to_chat(monkeypatch, tmp_path):
    server, client = setup_client(monkeypatch, tmp_path)
    captured = []
    monkeypatch.setattr(server, "answer_question", lambda prompt: (
        captured.append(prompt) or {"answer": "Resposta.", "sources": []}
    ))
    try:
        saved = client.post("/memories", json={"content": "Este dado é privado."})
        assert saved.status_code == 200
        changed = client.put("/preferences", json={"memory_enabled": False})
        assert changed.status_code == 200
        assert changed.json()["memory_enabled"] is False
        assert client.get("/preferences").json()["memory_enabled"] is False

        response = client.post("/chat", json={"message": "Oi"})
        assert response.status_code == 200
        assert "Este dado é privado." not in captured[0]
    finally:
        teardown(server)


def test_conversation_list_is_private_to_authenticated_owner(monkeypatch, tmp_path):
    server, client = setup_client(monkeypatch, tmp_path)
    try:
        created = client.post("/chat", json={"message": "Minha história"})
        conversation_id = created.json()["conversation_id"]
        listed = client.get("/conversations")
        assert listed.status_code == 200
        assert listed.json()["conversations"][0]["conversation_id"] == conversation_id
        assert listed.json()["conversations"][0]["title"] == "Minha história"

        server.app.dependency_overrides[server.get_current_user] = lambda: str(uuid.UUID(int=2))
        other = client.get("/conversations")
        assert other.status_code == 200
        assert other.json()["conversations"] == []
    finally:
        teardown(server)

def test_authorized_chapter_context_is_used_but_not_saved_as_chat_message(monkeypatch, tmp_path):
    server, client = setup_client(monkeypatch, tmp_path)
    captured = []
    monkeypatch.setattr(server, "answer_question", lambda prompt: (
        captured.append(prompt) or {"answer": "Análise concluída.", "sources": []}
    ))
    try:
        response = client.post("/chat", json={
            "message": "Analise a continuidade deste capítulo.",
            "context": "Obra: Exemplo. Cena 1: a personagem encontra uma chave.",
        })
        assert response.status_code == 200
        assert "Cena 1: a personagem encontra uma chave." in captured[0]
        conversation_id = response.json()["conversation_id"]
        history = client.get(f"/conversations/{conversation_id}")
        assert history.status_code == 200
        assert history.json()["messages"][0]["content"] == "Analise a continuidade deste capítulo."
        assert "Cena 1:" not in history.text
    finally:
        teardown(server)

def test_assistant_identity_preferences_are_private_per_user(monkeypatch, tmp_path):
    server, client = setup_client(monkeypatch, tmp_path)
    try:
        saved = client.put("/preferences", json={
            "assistant_name": "Meu Nox",
            "assistant_avatar_url": "https://example.com/avatar.png",
        })
        assert saved.status_code == 200
        assert saved.json()["assistant_name"] == "Meu Nox"
        assert saved.json()["assistant_avatar_url"] == "https://example.com/avatar.png"
        assert client.get("/preferences").json()["assistant_name"] == "Meu Nox"

        server.app.dependency_overrides[server.get_current_user] = lambda: str(uuid.UUID(int=2))
        other = client.get("/preferences")
        assert other.status_code == 200
        assert other.json()["assistant_name"] == "Nox"
        assert other.json()["assistant_avatar_url"] is None
    finally:
        teardown(server)


def test_assistant_avatar_requires_https(monkeypatch, tmp_path):
    server, client = setup_client(monkeypatch, tmp_path)
    try:
        response = client.put("/preferences", json={
            "assistant_name": "Nox",
            "assistant_avatar_url": "javascript:alert(1)",
        })
        assert response.status_code == 422
    finally:
        teardown(server)

