# Contexto do planejamento do builder

Solicitação de 12 de outubro de 2026: planejar a pipeline da nova aplicação, preservar todo o escopo antigo com melhorias, tornar o projeto apto a contribuições públicas, incorporar WebMCP, múltiplas IAs, generalizar o prompt UAB ambiente de referência, superar a dependência do armazenamento do navegador e preparar testes com Moodle local. Outra conversa cuida do design.

O executor e integrador é `/root`. Guardião somente leitura: `/root/legacy_inventory`. Pesquisa de integrações somente leitura: `/root/integration_research`. Os relatórios de revisão terão contextos independentes do autor. Limite: duas correções. Caminhos candidatos: `docs/BUILDER_PIPELINE_PLAN.md` e `GLOSSARY.md`. Registro e evidências pertencem ao integrador. Nenhum agente modifica design, CourseGen-AI ou implementação.

Fontes existentes: `AGENTS.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/BACKLOG.md`, `docs/PIPELINE.md`, `docs/AGENT_WORKFLOW.md` e `docs/AGENT_LOOP.md`. O pedido atual amplia a visão de versão completa; o MVP anterior não era o escopo completo. A nova proposta deve explicar essa diferença e as decisões de persistência que ainda dependem da modalidade de uso.

CourseGen-AI está no commit `30722e1` no início da inspeção; arquivos da cópia de trabalho podem ter mudanças e o relatório refere-se ao conteúdo inspecionado. Moodle-AI não tem repositório Git inicializado. A revisão usa digest SHA-256 dos dois arquivos candidatos, não um commit fictício.

CodeGraph MCP não aparece nas ferramentas desta sessão. A CLI `npm.cmd run codegraph:status` executou com código 0: índice com 26 arquivos, 153 nós e 777 arestas, uma adição e cinco modificações pendentes. A nova aplicação ainda não tem código; o índice contém protótipo/ferramentas. A inspeção de arquitetura e legado usa arquivos diretamente; não haverá sincronização do trabalho visual de outra conversa.

Docker CLI 27.3.1 foi encontrado. A consulta ao daemon falhou: pipe `dockerDesktopLinuxEngine` ausente. Isso impede declarar o laboratório operacional. Nenhum container, download de imagem ou instalação foi realizado. A consulta de versão é diagnóstico, não teste de restauração.

Verificação prevista: leitura integral dos candidatos; links relativos e cercas Markdown; conferência de referências de código e de fontes primárias; hash do mesmo conteúdo para ambas as revisões. Não rodar testes de aplicação para alteração de planejamento, nem reutilizar resultados históricos como evidência desta nova versão.

O usuário respondeu às perguntas: alvo é a versão do Moodle do ambiente de referência, cujo número ainda não conhece; escolheu somente navegador, com exportação e importação dos projetos. O plano deve refletir essa escolha e não exigir banco/contas. O pedido autoriza planejamento; a restrição existente de não iniciar a aplicação continua aplicável.
