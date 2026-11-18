# LinkStory AI — Plano de autonomia técnica

## Objetivo
Construir uma inteligência especializada em produção de mangás para a Kairox Studio, operada pela própria infraestrutura da Kairox e sem chamadas a APIs de IA de fornecedores externos em produção.

## Diagnóstico do código atual
A rota `api/experience-ai.js` ainda chama:
- Google Gemini para análise visual das páginas, interpretação de conteúdo e tarefas de linguagem.
- Google Gemini Interactions para geração/consulta de animação em vídeo.
- ElevenLabs para seleção de vozes, diálogo falado e geração de efeitos sonoros.
- Supabase para autenticação, banco de dados e armazenamento de arquivos.

Portanto, a Melhor Experiência atual ainda depende diretamente de fornecedores externos para as funções de IA e mídia. Não deve ser descrita como IA própria.

## Arquitetura-alvo

1. **Orquestrador LinkStory AI**
   - API própria que recebe tarefas, cria etapas, controla tentativas, registra resultados e mantém o estado do capítulo.
   - Fila de tarefas para não depender de uma única requisição web longa.
   - Aprovação humana obrigatória antes de publicar.

2. **Visão de mangá**
   - Modelo visual executado em servidor controlado pela Kairox.
   - Detectar quadros, ordem de leitura, balões, texto e personagens.
   - Preservar a imagem original; coordenadas e recortes são metadados não destrutivos.
   - Sinalizar baixa confiança para revisão do autor.

3. **Inteligência narrativa**
   - Modelo de linguagem auto-hospedado.
   - Organizar cenas, falas, narração, continuidade e instruções de correção por código de cena.
   - Responder apenas sobre a cena solicitada quando o autor pedir correção localizada.

4. **Áudio**
   - Reconhecimento de fala e síntese de voz executados em infraestrutura própria.
   - Elenco de vozes persistente por personagem, com aprovação do autor.
   - Efeitos sonoros por biblioteca própria e/ou síntese local.

5. **Movimento**
   - Começar com movimentos determinísticos no navegador (pan, zoom, parallax leve e transições), sem serviço externo de vídeo.
   - Investigar modelos de geração de vídeo auto-hospedados somente depois que visão, narrativa e áudio estiverem estáveis; essa etapa exige GPU e muito mais capacidade.

6. **Dados e segurança**
   - Manter o banco e os arquivos privados do autor.
   - Não usar páginas de autores para treinamento sem consentimento explícito.
   - Separar rascunhos, revisão e publicação.

## Plano de migração

### Fase 0 — Isolamento (primeiro trabalho)
- Criar interfaces internas para visão, linguagem, áudio e movimento.
- Tirar chamadas diretas aos fornecedores do fluxo de negócio.
- Manter o fluxo atual funcionando enquanto os novos adaptadores são preparados.
- Criar testes com páginas fictícias e fixtures, sem publicar conteúdo.

### Fase 1 — Primeiro modelo próprio em operação
- Preparar um servidor de inferência gerenciado pela Kairox.
- Substituir primeiro a análise visual e a organização de cenas por modelos auto-hospedados.
- Medir precisão, latência, custo e taxa de revisão humana.

### Fase 2 — Áudio próprio
- Substituir voz e efeitos externos por reconhecimento/síntese auto-hospedados.
- Validar qualidade em português brasileiro e consistência por personagem.

### Fase 3 — Movimento e autonomia ampliada
- Manter animações de câmera locais como base confiável.
- Avaliar geração de vídeo local com GPU adequada.
- Só remover os fornecedores antigos depois de testes ponta a ponta aprovados.

## Restrições reais
- Código próprio não elimina a necessidade de hardware, energia, rede e manutenção.
- Modelos abertos podem ser executados pela Kairox, mas suas licenças precisam ser verificadas individualmente.
- Treinar um modelo fundacional do zero não é a primeira etapa: exige grandes conjuntos de dados, equipes especializadas e orçamento elevado.
- Vercel não deve hospedar a inferência pesada. A aplicação web pode continuar na Vercel, enquanto a inferência roda em servidores GPU controlados pela Kairox.
- Não prometer autonomia total antes de remover e testar cada chamada externa.

## Critério de conclusão
A LinkStory AI só será considerada independente quando o fluxo completo de um capítulo — análise, cenas, correções, voz, áudio, animação e revisão — funcionar sem chamadas a APIs de IA de terceiros, com logs e testes verificáveis. Infraestrutura física contratada poderá continuar sendo uma dependência operacional até a Kairox possuir seus próprios servidores.
