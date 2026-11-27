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
