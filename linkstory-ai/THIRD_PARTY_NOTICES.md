# Third-party notices — LinkStory AI

This file records the principal licenses of the optional local audio stack and the default text model. Keep upstream notices and licenses when redistributing source or container images. This is a technical inventory, not legal advice.

## Text inference

- **Ollama:** Apache License 2.0. Upstream: https://github.com/ollama/ollama
- **Qwen2.5 7B (default model):** Apache License 2.0 for the 7B variant. Model card and exact variant: https://ollama.com/library/qwen2.5:7b
- **Qwen2.5 1.5B (optional lightweight model):** Apache License 2.0. Model family license notes: https://ollama.com/library/qwen2.5

Model weights and the software that runs them can have separate licenses. Verify the exact model tag and license before changing the production default.

## Brazilian Portuguese speech synthesis

- **Paradee PT-BR implementation:** Apache License 2.0. Upstream: https://github.com/astrowar/paradee_pt
- **Paradee-8M Pt-BR ONNX weights:** Apache License 2.0. Model: https://huggingface.co/eraldohug/Paradee-8M-PtBr
- **Phonemization dependency:** the upstream Python package uses eSpeak NG through its Python phonemizer dependencies. eSpeak NG is GPL-3.0; preserve its license and comply with its source-code obligations if distributing a container or binary that includes it. Upstream: https://github.com/espeak-ng/espeak-ng

The two synthetic voice options are model-provided voices (pf_dora and pm_alex), not a voice clone of a real person.

## Speech recognition

- **faster-whisper:** MIT License. Upstream: https://github.com/SYSTRAN/faster-whisper
- **Whisper model weights:** MIT License. Upstream: https://github.com/openai/whisper
