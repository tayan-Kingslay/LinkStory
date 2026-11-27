"""Download and warm up all local audio models before the API is exposed."""
from server import MODELS_READY_FILE, speech_model, transcription_model


def main():
    MODELS_READY_FILE.unlink(missing_ok=True)
    print("Preparando reconhecimento de voz local...")
    transcription_model()
    print("Preparando voz sintética Dora (pt-BR)...")
    speech_model("pf_dora")
    print("Preparando voz sintética Alex (pt-BR)...")
    speech_model("pm_alex")
    MODELS_READY_FILE.parent.mkdir(parents=True, exist_ok=True)
    temp = MODELS_READY_FILE.with_suffix(".tmp")
    temp.write_text("audio models ready\n", encoding="utf-8")
    temp.replace(MODELS_READY_FILE)
    print("Modelos de áudio preparados.")


if __name__ == "__main__":
    main()
