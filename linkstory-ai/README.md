# LinkStory AI — motor independente

Este serviço é o núcleo de inferência próprio da Kairox Studio. Ele usa Ollama para executar o modelo no servidor controlado pelo projeto e Chroma para recuperar conhecimento local (RAG). Não usa Gemini, OpenAI ou APIs comerciais de geração de texto.

> RAG não é treinamento do modelo. A base recupera trechos relevantes dos arquivos indexados e os fornece ao modelo durante a resposta.

## Arquitetura

- **Inferência:** Ollama + modelo configurável (padrão: `llama3.1:8b`).
- **Embeddings e recuperação:** `nomic-embed-text` + Chroma persistente.
- **Histórico:** SQLite em volume persistente, com isolamento por ID verificado do usuário.
- **Identidade:** cada chamada de chat valida o access token no Supabase Auth (`/auth/v1/user`). Nenhum ID de usuário enviado pelo navegador é aceito como identidade.
- **API:** FastAPI, CORS restrito, limite de 20 mensagens/minuto por usuário e mensagens com até 4.000 caracteres.

## Executar com Docker Compose

Requisitos: Docker Engine + Compose, armazenamento persistente e recursos de CPU/RAM compatíveis com o modelo escolhido. Para melhor desempenho, use uma máquina com GPU suportada pelo Ollama. Antes de uso comercial, revise e aceite os termos da licença Meta Llama 3.1; o fato de o modelo rodar localmente não elimina obrigações de licença.

1. Copie `.env.example` para `.env` e preencha `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` com os dados públicos do projeto Supabase. A chave publishable não substitui o token do usuário; ela nunca concede acesso por si só.
2. Inicie os serviços: `docker compose up -d --build`.
3. Baixe os modelos no serviço privado: `docker compose exec ollama ollama pull llama3.1:8b` e `docker compose exec ollama ollama pull nomic-embed-text`.
4. Indexe uma cópia limpa do repositório (sem `.env`, tokens, dados privados ou pastas de dependências): `docker compose run --rm --no-deps -v /caminho/LinkStory:/source api python ingest.py /source`.
5. Confira `GET /health`. O campo `status` só será `ready` quando a autenticação estiver configurada, Ollama estiver acessível e a pasta vetorial existir.

A API fica vinculada a `127.0.0.1:8000`; publique-a atrás de um proxy HTTPS. A porta 11434 do Ollama não é exposta. Não publique a porta da API diretamente sem TLS, firewall e controles de acesso.

## Configuração

Veja `.env.example`. `LINKSTORY_CHAT_DB` e `LINKSTORY_CHROMA_DIR` precisam apontar para armazenamento persistente. Em uma implantação com várias réplicas, substitua SQLite por um banco compartilhado antes de aumentar a escala.

## API

Todas as rotas de conversa exigem `Authorization: Bearer <access_token_supabase>`.

- `GET /health`: diagnóstico sem dados de usuário.
- `POST /chat`: corpo `{ "message": "...", "conversation_id": null }`; devolve resposta, ID e fontes.
- `GET /conversations/{conversation_id}`: histórico pertencente ao usuário autenticado.

A API valida o token consultando Supabase Auth. O proprietário da conversa é sempre o ID retornado por Auth. IDs de conversa de outra conta não retornam conteúdo. O histórico legado criado pela versão de token compartilhado não é associado automaticamente a nenhuma conta.

## Testes

Instale `requirements-dev.txt` e execute `pytest -q`. Os testes não precisam de Ollama real; as chamadas de inferência e Auth são simuladas.

## Limites conhecidos antes da publicação

- O servidor de inferência precisa estar hospedado continuamente; Vercel hospeda o site, não o processo Ollama.
- Configure os secrets no host do motor, nunca no JavaScript do navegador ou no Git.
- Antes de abrir a IA aos usuários, teste com duas contas reais para confirmar isolamento, expiração de sessão, rate limit e persistência após reinicialização.
- Avalie qualidade do modelo em português, latência, memória RAM/VRAM, custo de hospedagem e licenças do modelo escolhido.
- Voz, transcrição, sincronização labial e animações do personagem são módulos separados; não estão incluídos nesta API de texto.
