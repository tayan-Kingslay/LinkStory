# LinkStory AI — motor independente

Este serviço é o núcleo de inferência próprio da Kairox Studio. Ele usa Ollama para executar o modelo no servidor controlado pelo projeto e Chroma para recuperar conhecimento local (RAG). Não usa Gemini, OpenAI ou APIs comerciais de geração de texto.

> RAG não é treinamento do modelo. A base recupera trechos relevantes dos arquivos indexados e os fornece ao modelo durante a resposta.

## Arquitetura

- **Inferência:** Ollama + modelo configurável (padrão: `llama3.1:8b`).
- **Embeddings e recuperação:** `nomic-embed-text` + Chroma persistente.
- **Memória:** SQLite persistente com histórico por conversa e até 50 notas de memória por usuário; até 10 notas de até 1.000 caracteres entram no contexto de cada resposta. Somente o próprio usuário pode salvar, listar ou apagar suas notas.
- **Identidade:** cada chamada de chat valida o access token no Supabase Auth (`/auth/v1/user`). Nenhum ID de usuário enviado pelo navegador é aceito como identidade.
- **API:** FastAPI, CORS restrito, limite de 20 chamadas/minuto por usuário e mensagens com até 4.000 caracteres.
- **Fala:** Paradee-8M pt-BR em ONNX local, com duas vozes selecionáveis e tempos por palavra para sincronização da boca.
- **Audição:** faster-whisper local, com transcrição em português e upload limitado a 20 MB.

## Executar com Docker Compose

Requisitos: Docker Engine + Compose, armazenamento persistente e recursos de CPU/RAM compatíveis com o modelo escolhido. Para melhor desempenho, use uma máquina com GPU suportada pelo Ollama. Antes de uso comercial, revise e aceite os termos da licença Meta Llama 3.1; o fato de o modelo rodar localmente não elimina obrigações de licença.

1. Copie `.env.example` para `.env` e preencha `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` com os dados públicos do projeto Supabase. A chave publishable não substitui o token do usuário; ela nunca concede acesso por si só.
2. Execute `docker compose up -d --build`. O Compose baixa o Llama 3.1 e o Nomic, prepara o Whisper e as duas vozes Paradee, indexa somente os documentos públicos explicitamente aprovados em `knowledge/PUBLIC_KNOWLEDGE.md` e só então inicia a API.
3. A primeira inicialização pode levar vários minutos e baixar alguns gigabytes. Os modelos e o histórico ficam em volumes persistentes; não remova esses volumes ao atualizar o container.
4. Confira `docker compose ps` e `GET /health`. O campo `status` só será `ready` quando autenticação, modelos de texto, base vetorial e modelos de áudio estiverem preparados.

A API fica vinculada a `127.0.0.1:8000`; publique-a atrás de um proxy HTTPS. A porta 11434 do Ollama não é exposta. Não publique a porta da API diretamente sem TLS, firewall e controles de acesso.

## Configuração

Veja `.env.example`. `LINKSTORY_CHAT_DB`, `LINKSTORY_CHROMA_DIR`, `HF_HOME` e `LINKSTORY_TTS_CACHE` precisam apontar para armazenamento persistente. Em uma implantação com várias réplicas, substitua SQLite por um banco compartilhado antes de aumentar a escala.

## API

Todas as rotas de conversa exigem `Authorization: Bearer <access_token_supabase>`.

- `GET /health`: diagnóstico sem dados de usuário.
- `POST /chat`: corpo `{ "message": "...", "conversation_id": null }`; devolve resposta, ID e fontes.
- `GET /conversations/{conversation_id}`: histórico pertencente ao usuário autenticado.
- `GET /memories`, `POST /memories` e `DELETE /memories/{memory_id}`: memórias persistentes controladas pelo próprio usuário. O chat recebe até 10 notas salvas como contexto; nenhuma memória é criada automaticamente.
- `POST /transcribe`: recebe um arquivo de áudio multipart (`webm`, `mp4`, `mp3`, `wav` ou `ogg`) e devolve texto em pt-BR. Limite de 20 MB.
- `POST /speak`: recebe `{ "text": "...", "voice": "pf_dora" }` ou `pm_alex` e devolve WAV mono 24 kHz. O cabeçalho `X-LinkStory-Word-Timings` contém os tempos das palavras em JSON codificado em Base64 URL-safe, para sincronizar a boca do personagem.

A API valida o token consultando Supabase Auth. O proprietário da conversa e das memórias é sempre o ID retornado por Auth. IDs de conversa ou memória de outra conta não retornam conteúdo. As notas de memória são salvas apenas quando o usuário solicita explicitamente. O histórico legado criado pela versão de token compartilhado não é associado automaticamente a nenhuma conta.

## Testes

Instale `requirements-dev.txt` e execute `pytest -q`. Os testes não precisam de Ollama real; as chamadas de inferência e Auth são simuladas.

## Limites conhecidos antes da publicação

- O servidor de inferência precisa estar hospedado continuamente; Vercel hospeda o site, não o processo Ollama.
- Configure os secrets no host do motor, nunca no JavaScript do navegador ou no Git.
- Antes de abrir a IA aos usuários, teste com duas contas reais para confirmar isolamento, expiração de sessão, rate limit e persistência após reinicialização.
- Avalie qualidade do modelo em português, latência, memória RAM/VRAM, custo de hospedagem e licenças do modelo escolhido.
- A API entrega áudio e tempos de palavras, mas a animação visual da boca/expressões ainda precisa ser conectada à interface do personagem.
- A voz Dora (`pf_dora`) e Alex (`pm_alex`) são vozes sintéticas de demonstração; a escolha final da voz/personagem deve ser feita na interface.
- As licenças dos componentes de áudio e inferência estão listadas em `THIRD_PARTY_NOTICES.md`.
