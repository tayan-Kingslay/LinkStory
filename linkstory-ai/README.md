# LinkStory AI — Memória técnica local (Fase 0)

Este módulo é o primeiro componente executável da futura IA da Kairox Studio.
Ele indexa o código do LinkStory em um banco vetorial local e permite perguntas
em linguagem natural usando um modelo executado pelo Ollama.

**Importante:** isto é RAG (busca + contexto), não treinamento de um modelo.
Ollama executa o modelo localmente. Nenhuma chamada a Gemini, OpenAI ou ElevenLabs
é feita por este módulo.

## Requisitos

- Python 3.10 ou superior.
- Ollama instalado e em execução na máquina/servidor que hospedará a IA.
- RAM suficiente para o modelo escolhido. O padrão é llama3.1:8b.
- Para uso em produção, preferir um servidor Linux com GPU compatível e armazenamento persistente.

## Preparar o motor local

No terminal do servidor, baixar os modelos llama3.1:8b e nomic-embed-text pelo Ollama.
Depois, confirmar que aparecem na lista de modelos instalados.

## Instalar

Na pasta linkstory-ai, criar um ambiente virtual Python e instalar as dependências de requirements.txt.
No Windows, a ativação do ambiente usa .venv\\Scripts\\activate.

## Indexar o código do LinkStory

Aponte para uma cópia local do repositório:

    python ingest.py /caminho/para/LinkStory

O indexador ignora dependências, pastas de build, arquivos binários e arquivos acima de 1,5 MB.
A base vetorial é gravada em linkstory-ai/data/chroma por padrão.

## Fazer uma pergunta

    python ask.py "Como funciona a geração da Melhor Experiência?"

## Configuração opcional

- OLLAMA_BASE_URL: endereço do Ollama (padrão http://127.0.0.1:11434).
- LINKSTORY_CHAT_MODEL: modelo de conversa (padrão llama3.1:8b).
- LINKSTORY_EMBED_MODEL: modelo de embeddings (padrão nomic-embed-text).
- LINKSTORY_CHROMA_DIR: pasta persistente do Chroma.

## Limites desta fase

- A memória responde sobre o código indexado; não altera o sistema.
- O índice precisa ser atualizado após mudanças relevantes no repositório.
- O modelo local ainda precisa ser avaliado quanto à qualidade em português e programação.
- Isto não substitui os modelos especializados de visão, áudio e movimento necessários para produzir capítulos de mangá.
- O módulo ainda não está conectado à aplicação web nem implantado em produção.
- Não indexe segredos, tokens, arquivos .env, dados pessoais ou material privado sem autorização.

## Próximas fases

1. Testes automatizados do indexador e recuperação.
2. API interna autenticada para consultar esta memória.
3. Separação entre memória técnica, regras editoriais e conhecimento de cada mangá.
4. Modelos locais de visão e linguagem para análise de páginas e cenas.
5. Áudio local e sincronização.
