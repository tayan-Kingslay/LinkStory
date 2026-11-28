# LinkStory AI — motor independente

Este serviço é o núcleo de inferência que a Kairox pode hospedar e administrar. O código da aplicação, as regras do Nox, a base de conhecimento e os dados dos usuários ficam sob controle do projeto. O modelo de linguagem é um modelo de pesos abertos de terceiros executado localmente pelo Ollama — isso não significa que a Kairox treinou o modelo do zero nem que é dona dos pesos.

> RAG não é treinamento do modelo. A base recupera trechos de documentos aprovados e os fornece ao modelo durante a resposta.

## Arquitetura

- **Inferência:** Ollama + AI2 OLMo 2 7B por padrão; o modelo pode ser trocado por configuração.
- **Embeddings e recuperação:** `nomic-embed-text` + Chroma persistente.
- **Memória:** SQLite persistente com histórico por conversa e até 50 notas por usuário; até 10 notas entram no contexto quando a memória está habilitada. O usuário controla suas notas.
- **Identidade:** cada chamada valida o token no Supabase Auth. O ID do usuário nunca é aceito do navegador como prova de identidade.
- **API:** FastAPI, CORS restrito, limite de 20 chamadas/minuto por usuário e mensagens de até 4.000 caracteres.
- **Voz opcional:** Paradee-8M pt-BR para síntese e faster-whisper para transcrição, ambos executados localmente. Não são necessários para o chat de texto.

## Recursos e escolha do modelo

O modelo padrão `olmo2:7b` ocupa aproximadamente 4,5 GB para os pesos quantizados publicados no Ollama e usa contexto de 4K tokens nesta configuração. O OLMo 2 é desenvolvido pelo Allen Institute for AI (AI2), instituto de pesquisa sem fins lucrativos; seus pesos, código e materiais de treinamento são publicados de forma aberta, e a variante 7B usa licença Apache 2.0. O modelo roda localmente: o Nox não envia prompts a uma API comercial de IA.

Isso não prova que a qualidade em português brasileiro será suficiente. OLMo 2 foi avaliado principalmente em benchmarks em inglês; antes de abrir o Nox a usuários, compare respostas reais em PT-BR para criação de personagens, diálogos, continuidade e instruções. Não prometa desempenho equivalente a modelos comerciais sem esses testes. Uma máquina com 16 GB de RAM é um ponto de partida mais confortável; GPU compatível melhora a velocidade, mas não é obrigatória. Em CPU, as respostas podem demorar bastante.

O computador precisa permanecer ligado e conectado à internet para atender usuários. Um protótipo local não equivale a um serviço 24 horas. Não existe promessa de hospedagem gratuita, ilimitada e permanente neste projeto.

## Executar o motor localmente

Requisitos: Docker Engine + Docker Compose, armazenamento persistente e máquina compatível com o modelo escolhido.

1. Entre nesta pasta (`linkstory-ai`) e copie `.env.example` para `.env`.
2. Preencha `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` com os dados públicos do projeto Supabase. A chave publishable não substitui o token do usuário e nunca concede acesso por si só.
3. Execute `docker compose up -d --build`. O Compose baixa o modelo de texto e o modelo de embeddings, indexa somente `knowledge/PUBLIC_KNOWLEDGE.md` e inicia a API. O primeiro download pode ocupar vários gigabytes.
4. Confira `docker compose ps` e `GET /health`. O campo `status` será `ready` quando autenticação, modelo de texto, embeddings e base vetorial estiverem preparados.
5. Para preparar voz, execute separadamente `docker compose --profile audio run --rm prepare-audio`. Isso baixa modelos adicionais e pode consumir bastante armazenamento; o chat de texto não depende desse passo.

A API fica vinculada a `127.0.0.1:8000`. Para acesso público, ela precisa de um host permanente, proxy HTTPS, firewall e monitoramento. A porta 11434 do Ollama não é exposta. Nunca publique a API sem TLS e controles de acesso.

## Configuração

O modelo padrão e o modelo de embeddings são definidos em `.env` por `LINKSTORY_CHAT_MODEL` e `LINKSTORY_EMBED_MODEL`. Para trocar o modelo, atualize a variável e execute novamente `docker compose up -d`; confirme o nome em `GET /health` antes de testar o chat.

Depois de hospedar a API, defina a URL pública HTTPS em `linkstory-ai-config.js`, na raiz do site, atribuindo-a a `window.LINKSTORY_AI_API_URL`. Esse arquivo contém somente a URL pública, nunca chaves secretas.

`LINKSTORY_CHAT_DB`, `LINKSTORY_CHROMA_DIR`, `HF_HOME` e `LINKSTORY_TTS_CACHE` precisam apontar para armazenamento persistente. Em uma implantação com várias réplicas, substitua SQLite por um banco compartilhado antes de escalar.

## API

Todas as rotas de conversa exigem `Authorization: Bearer <access_token_supabase>`.

- `GET /health`: diagnóstico sem dados de usuário. `status=ready` confirma o chat de texto; `audio_models_ready` informa separadamente se voz está preparada.
- `POST /chat`: recebe mensagem, ID opcional de conversa e contexto opcional. O contexto aceita até 12.000 caracteres de texto/metadados de uma obra autorizada pelo autor naquela solicitação; não é salvo como mensagem nem indexado na base compartilhada.
- `GET /conversations`: lista somente as conversas do usuário autenticado.
- `PUT /conversations/{conversation_id}/title`: renomeia somente uma conversa pertencente ao usuário autenticado.
- `GET /conversations/{conversation_id}`: histórico pertencente ao usuário autenticado.
- `GET /preferences` e `PUT /preferences`: controla memória e identidade do assistente por conta.
- `GET /memories`, `POST /memories`, `PUT /memories/{memory_id}` e `DELETE /memories/{memory_id}`: notas persistentes controladas pelo usuário; nenhuma memória é criada automaticamente.
- `POST /transcribe`: transcrição pt-BR local, até 20 MB, quando o perfil de áudio estiver preparado.
- `POST /speak`: síntese de voz local quando o perfil de áudio estiver preparado.

A identidade da conversa e das memórias vem sempre do usuário validado pelo Supabase Auth. IDs de outra conta não retornam conteúdo. O histórico legado criado por uma versão de token compartilhado não é associado automaticamente a nenhuma conta.

## Testes

Instale `requirements-dev.txt` e execute `pytest -q`. Os testes simulam inferência e autenticação; eles não comprovam que o modelo real está instalado, que o host aguenta carga ou que o áudio funciona em um iPhone. Antes de abrir a IA aos usuários, teste com duas contas reais, expiração de sessão, limite de uso e persistência após reinicialização.

## Limites antes da publicação

- O motor ainda precisa de uma máquina ligada continuamente. Vercel hospeda o site, não o processo Ollama.
- Nenhuma URL de API pública está configurada em `linkstory-ai-config.js`; por isso, o chat online permanece desativado.
- Não há garantia de 24/7, escalabilidade ou custo zero até existir infraestrutura permanente e testada.
- A interface de voz ainda precisa de teste real no iPhone; os modelos de áudio são opcionais. A transcrição atualmente usa pesos Whisper originalmente publicados pela OpenAI, executados localmente (não usa API); se a regra do projeto também proibir modelos criados por grandes empresas, substitua esse componente antes de ativar voz.
- O contexto de capítulo atual inclui somente texto e metadados estruturados; não analisa imagens de páginas.
- Revise as licenças dos componentes e do modelo exato antes de uso comercial. Consulte `THIRD_PARTY_NOTICES.md`.
