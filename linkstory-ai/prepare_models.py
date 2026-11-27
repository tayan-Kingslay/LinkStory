"""Download and warm up all local audio models before the API is exposed."""
from server import MODELS_READY_FILE, speech_model, transcription_model


def main():
    MODELS_READY_FILE.unlink(missing_ok=True)
    print("Preparando reconhecimento de voz local...")
    transcription_model()
    print("Preparando e testando voz sintética Dora (pt-BR)...")
    dora = speech_model("pf_dora")
    dora_audio, _ = dora.with_timestamps("Olá, LinkStory. Teste de voz.", voice="pf_dora")
    if len(dora_audio) == 0:
        raise RuntimeError("A voz Dora não gerou áudio.")
    print("Preparando e testando voz sintética Alex (pt-BR)...")
    alex = speech_model("pm_alex")
    alex_audio, _ = alex.with_timestamps("Olá, LinkStory. Teste de voz.", voice="pm_alex")
    if len(alex_audio) == 0:
        raise RuntimeError("A voz Alex não gerou áudio.")
    MODELS_READY_FILE.parent.mkdir(parents=True, exist_ok=True)
    temp = MODELS_READY_FILE.with_suffix(".tmp")
    temp.write_text("audio models ready\n", encoding="utf-8")
    temp.replace(MODELS_READY_FILE)
    print("Modelos de áudio preparados.")


if __name__ == "__main__":
    main()
