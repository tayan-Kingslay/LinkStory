from core import iter_source_files


def test_ingest_skips_dotenv_and_credential_files(tmp_path):
    (tmp_path / "app.py").write_text("print('safe')", encoding="utf-8")
    (tmp_path / ".env.production").write_text("API_KEY=do-not-index", encoding="utf-8")
    (tmp_path / "credentials.json").write_text('{"secret":"do-not-index"}', encoding="utf-8")
    (tmp_path / "private.pem").write_text("private-key", encoding="utf-8")
    (tmp_path / "data").mkdir()
    (tmp_path / "data" / "notes.txt").write_text("private data", encoding="utf-8")

    indexed = {path.name for path in iter_source_files(tmp_path)}
    assert indexed == {"app.py"}
