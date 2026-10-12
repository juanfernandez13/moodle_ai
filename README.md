# Moodle AI

Moodle-AI é o nome provisório de uma nova aplicação para professores e equipes pedagógicas prepararem cursos Moodle com auxílio de IA. O primeiro MVP transforma um planejamento DOCX suportado ou uma criação manual em um curso editável, validado e exportável como `.mbz`.

Esta pasta contém o planejamento, catálogo visual e a primeira ferramenta executável: validação de rascunhos por CLI. O início foi autorizado em 12/10/2026. [Spec V01](docs/specs/V01-course-to-mbz.md), [tickets](docs/tickets/README.md) e [registro V01-01](docs/tasks/V01-01.json) mostram escopo e evidências. O projeto [CourseGen-AI](../CourseGen-AI/README.md) é referência técnica independente; não é alterado por esta implementação.

## Executar o primeiro ticket

Requer Node 24 e npm. Dependências locais fixadas no lockfile; nenhuma chave de IA é necessária.

```powershell
npm ci
npm run check
npm run demo
npm run validate:draft -- tests/fixtures/course-valid.json
node dist/cli/validate-draft.js tests/fixtures/course-valid.json
```

A fixture válida contém uma seção, seis atividades (dois fóruns, duas tarefas e dois quizzes) e três referências de anexos. O validador confere schema, identidade, referências, questões, datas e categorias de avaliação; a CLI imprime contagens/pendências e não o conteúdo completo. Saídas: 0 válido; 1 JSON/contrato/regra inválida; 2 uso/arquivo/limite de 1 MiB. A validação não confirma bytes dos anexos.

V01-01 inicia o projeto. Geração MBZ, Moodle Lab, editor, importação e persistência ainda são tickets próprios; o primeiro comando não produz um curso restaurado nem comprova compatibilidade. A UI continuará usando Next/TypeScript/Tailwind e a direção visual existente.

## Documentos para desenvolver

| Documento | Decisão que orienta |
| --- | --- |
| [PRD](docs/PRD.md) | Problema, público, MVP, requisitos e critérios de aceite. |
| [Pipeline](docs/PIPELINE.md) | Preparação, liberação da implementação, tarefas, verificações e revisões. |
| [Arquitetura](docs/ARCHITECTURE.md) | Modelo do curso, módulos, diagramas Mermaid e decisões com alternativas. |
| [Design](docs/DESIGN_BRIEF.md) | Direção visual, tokens e duas propostas de organização do editor. |
| [Design system em HTML](design-system.html) | Catálogo visual interativo para avaliar cores, tipografia, componentes e editor. |
| [Quadro visual de telas](docs/screen-flow.html) e [Mermaid](docs/SCREEN_FLOW.md) | Navegação, decisões, erros e retornos, com distinção entre demo, MVP e futuro. |
| [Avaliação de usabilidade](docs/USABILITY_REVIEW.md) | Tarefas observadas no protótipo, problemas encontrados e roteiro para teste com professores. |
| [Prontidão do planejamento](docs/PLANNING_READINESS.md) | Gates e divergências a resolver antes da primeira implementação e da demonstração. |
| [Backlog](docs/BACKLOG.md) | Entregas demonstráveis, dependências e verificação. |
| [Trabalho com subagentes](docs/AGENT_WORKFLOW.md) | Responsabilidade por arquivos, integração e revisão independente. |
| [Loop de agentes](docs/AGENT_LOOP.md) | Skill local de coordenação, papéis, evidências e controle executável de estado. |
| [Skills e CodeGraph MCP](docs/SKILLS_AND_MCP.md) | Seleção de ferramentas, momento de uso e estado da integração. |
| [Instruções dos agentes](AGENTS.md) | Regras curtas que devem acompanhar o código. |

## O que torna o produto genérico

O curso terá um modelo comum para Moodle. Três escolhas serão separadas: como interpretar um documento, quais convenções pedagógicas aplicar e quais recursos o exportador Moodle suporta. Dois documentos de estruturas diferentes, um por tópicos e outro semanal, testarão essa separação.

O produto anunciará os formatos e a compatibilidade efetivamente testados. Um backup gerado não comprova sozinho que todos os recursos foram restaurados; a demonstração deverá comparar o curso restaurado com o planejamento esperado.

## Sequência inicial

O usuário liberou execução/criação nesta conversa em 12/10/2026. A instrução substitui o bloqueio anterior; o [processo local](docs/PIPELINE.md) coordena spec, contratos, tickets, checks e revisões.

1. Revisar as propostas de PRD, arquitetura e design; fechar versão Moodle alvo, detalhes dos dois perfis de documento e prazo.
2. Preparar o projeto e as ferramentas locais, com scripts de verificação e dependências fixadas em lockfile.
3. Demonstrar um curso sintético até a exportação, preservando as regras úteis do gerador legado atrás de um adapter.
4. Adicionar editor, anexos reais e interpretação por IA em entregas pequenas.
5. Comprovar o fluxo genérico com dois exemplos e restauração em Moodle de teste.

O contrato de validação é a primeira implementação; demais decisões seguem a spec/backlog. As 13 skills de Matt Pocock e `frontend-design` estão instaladas em `.agents/skills`, com origem e hashes em `skills-lock.json`. Esta execução usa `project-loop` local e não afirma ter executado todos os workflows upstream. CodeGraph 1.6.2 continua ferramenta local; MCP não estava disponível e sua consulta de status não abriu o banco nesta execução, então foi usada inspeção de arquivos.

O grafo precisa de nova sincronização antes de analisar o código acrescentado. Os diagramas Mermaid descrevem arquitetura e navegação planejadas. Consulte [o registro das ferramentas](docs/SKILLS_AND_MCP.md) para comandos e limitações.

## Ferramentas locais

```powershell
npm ci
npm run codegraph:init
npm run codegraph:status
```

O `package.json` contém a CLI/domínio TypeScript e os scripts de verificação, além das ferramentas existentes. Scripts Next e dependências de UI serão definidos no ticket do editor; nenhuma aplicação web é iniciada por `npm run demo`.

Os protótipos usam Tailwind CSS 4.3.3 compilado localmente. Para instalar suas dependências e atualizar o CSS compartilhado:

```powershell
npm --prefix docs/design-proposals/glass-owl-v4 ci
npm run design:css
```

O cabeçalho da prévia e a estrutura do quadro de telas usam utilities; vidro, cenário e conexões mantêm CSS específico. As fontes do build são explícitas, sem Preflight nem carregamento de Tailwind em runtime. Isso prepara o design, sem criar a aplicação.
