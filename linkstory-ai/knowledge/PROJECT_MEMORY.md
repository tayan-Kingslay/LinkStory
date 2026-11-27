# Memória privada do projeto — LinkStory, Kairox Studio e Nox

Este arquivo é contexto interno para desenvolvimento e manutenção. **Não indexar na base de conhecimento acessível aos usuários do LinkStory.** Não tratar ideias como funcionalidades já implementadas.

## 1. Projetos e identidade

- **Kairox Studio** é o estúdio independente do fundador. Sua identidade e decisões permanecem sob controle do estúdio.
- **LinkStory** é uma plataforma da Kairox voltada a mangás, leitura, publicação e criação.
- **Nox** é o assistente de IA planejado para o LinkStory. Deve ser amigável, descontraído, criativo e colaborativo, com identidade própria.
- O fundador prefere comunicação direta, simples, em português brasileiro, avançando por etapas e sem despejar decisões demais de uma vez.

## 2. Decisões e limites do fundador

- Priorizar autonomia tecnológica: o objetivo é executar o núcleo inteligente em infraestrutura controlada pela Kairox, sem depender diretamente de APIs comerciais de IA.
- RAG não é treinamento do modelo. Ollama + modelo aberto + Chroma recuperam documentos indexados; isso não significa que o modelo foi treinado com eles.
- Não publicar, mesclar ou alterar o site oficial sem autorização explícita.
- Não contratar serviços, provisionar infraestrutura paga ou gerar custos sem aprovação explícita.
- Não expor segredos, tokens, dados privados ou memórias de um usuário para outro.
- Preservar decisões de produto e identidade visual aprovadas. Não redesenhar nem acrescentar funcionalidades por iniciativa própria.
- Distinguir sempre entre ideia, planejado, em desenvolvimento, implementado e testado.

## 3. LinkStory: contexto interno de produto

- Áreas já discutidas incluem **Biblioteca** e **Pra você**.
- O cabeçalho aprovado foi descrito com busca à esquerda, logo centralizada e sino/notificações à direita.
- **Meu Estúdio** deve permitir editar e apagar mangás, com confirmação antes de excluir.
- Obras colaborativas devem creditar autor principal e colaboradores com suas funções.
- Foram propostas duas modalidades de publicação: **Tradicional** e **Modo Experiência**, com escolha direta entre as duas e possibilidade futura de conectar versões.
- Essas notas registram decisões e propostas; não garantem que cada item esteja implementado na versão atual.

## 4. Visão desejada para Nox

- Ajudar usuários a desenvolver ideias, personagens, personalidades, roteiros, arcos, capítulos e diálogos.
- Analisar a continuidade narrativa e acompanhar o progresso de projetos autorizados pelo usuário.
- Dar opiniões e sugestões sem alterar ou publicar conteúdo automaticamente.
- Ajudar também iniciantes a aprender técnicas de criação de mangás.
- Não gerar imagens. Pode ajudar com descrições e conceitos visuais em texto.
- Consultar apenas obras e dados que o usuário autorizou, respeitando permissões por conta.
- Ter memória individual e controlada pelo usuário; nunca misturar memórias entre contas.
- A experiência desejada inclui texto e voz, identidade visual própria, histórico e personalização de nome/foto por usuário.
- A visão aprovada pelo fundador é que o recurso seja gratuito, sujeito a limites razoáveis contra abuso. Não implementar cobrança ou plano premium sem nova decisão explícita.

## 5. Privacidade de obras e conhecimento confidencial

- O Nox pode analisar obras de um usuário somente dentro das permissões daquela conta e do projeto.
- Conteúdo privado de uma conta nunca deve ser usado para responder a outro usuário.
- Materiais inéditos, segredos criativos, documentos internos e universos narrativos privados da Kairox são confidenciais.
- **Tuketon é um projeto confidencial.** Não indexar nem disponibilizar a usuários gerais detalhes de lore, arcos, personagens, segredos, regras, economia, documentos ou materiais não publicados. Só o fundador pode autorizar explicitamente uma futura liberação.
- Não usar busca recursiva em todo o repositório para alimentar o RAG. A ingestão deve usar uma lista explícita de documentos públicos aprovados.

## 6. Estado técnico conhecido

Repositório: https://github.com/tayan-Kingslay/LinkStory  
Branch de desenvolvimento: `feature/linkstory-ai-autonomia`  
PR em rascunho: https://github.com/tayan-Kingslay/LinkStory/pull/14

Componentes preparados na branch:
- API FastAPI com validação de sessão Supabase.
- Histórico e memórias em SQLite, separados por ID autenticado do usuário.
- Motor planejado com Ollama, modelo Llama configurável e Chroma para RAG.
- Transcrição local com faster-whisper e síntese de voz Paradee.
- Cliente JavaScript para conversar com a API e usar áudio.
- Docker Compose e testes automatizados.

Limitações:
1. Não há servidor permanente de inferência provisionado.
2. Não há orçamento aprovado para infraestrutura.
3. A interface do Nox ainda precisa ser integrada e validada.
4. Testes automatizados simulados não comprovam inferência real nem implantação de produção.
5. Não afirmar que Nox está online, pronto para produção ou testado de ponta a ponta.
6. Revisar licenças de modelos e dependências antes de uso comercial.

## 7. Regras de trabalho

- Nunca publicar, mesclar, apagar, contratar ou gerar custos sem autorização explícita.
- Não inventar fatos internos. Se a documentação não responder, dizer isso.
- Não executar alterações extras fora do escopo aprovado.
- Relatar claramente o que foi alterado, o que foi testado e o que ainda falta.
