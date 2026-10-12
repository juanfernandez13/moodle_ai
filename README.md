# Planejamento do Moodle AI

Moodle-AI é o nome provisório de uma nova aplicação para professores e equipes pedagógicas prepararem cursos Moodle com auxílio de IA. O primeiro MVP transforma um planejamento DOCX suportado ou uma criação manual em um curso editável, validado e exportável como `.mbz`.

Esta pasta contém o planejamento inicial, o catálogo visual e as ferramentas locais. A aplicação ainda será implementada. O projeto [CourseGen-AI](../CourseGen-AI/README.md) é uma referência técnica independente; convenções específicas serão reaproveitadas somente quando fizerem parte de um perfil explícito.

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

O usuário pediu para fechar o pipeline antes de iniciar código. A aplicação permanece sem implementação; [a proposta do processo](docs/PIPELINE.md) é o próximo artefato a revisar.

1. Revisar as propostas de PRD, arquitetura e design; fechar versão Moodle alvo, detalhes dos dois perfis de documento e prazo.
2. Preparar o projeto e as ferramentas locais, com scripts de verificação e dependências fixadas em lockfile.
3. Demonstrar um curso sintético até a exportação, preservando as regras úteis do gerador legado atrás de um adapter.
4. Adicionar editor, anexos reais e interpretação por IA em entregas pequenas.
5. Comprovar o fluxo genérico com dois exemplos e restauração em Moodle de teste.

As decisões técnicas estão propostas, não implementadas. As 13 skills de Matt Pocock e `frontend-design` estão instaladas em `.agents/skills`, com origem e hashes em `skills-lock.json`. CodeGraph 1.6.2 está instalado localmente e o protocolo MCP foi verificado. A configuração em `.codex/config.toml` será carregada ao abrir esta pasta como projeto confiável e reiniciar o Codex; o MCP ainda não está disponível na sessão que fez o setup.

O índice da aplicação ainda não existe, pois ela não foi iniciada. A CLI já permite investigar os scripts dos protótipos locais e foi usada nas revisões de design; o MCP permanece indisponível nesta sessão. Os diagramas Mermaid descrevem arquitetura e navegação propostas. Consulte [o registro das ferramentas](docs/SKILLS_AND_MCP.md) para comandos e limitações.

## Ferramentas locais

```powershell
npm ci
npm run codegraph:init
npm run codegraph:status
```

O `package.json` atual contém somente ferramentas de desenvolvimento. A escolha e instalação das dependências da aplicação pertencem à primeira entrega do backlog.

Os protótipos usam Tailwind CSS 4.3.3 compilado localmente. Para instalar suas dependências e atualizar o CSS compartilhado:

```powershell
npm --prefix docs/design-proposals/glass-owl-v4 ci
npm run design:css
```

O cabeçalho da prévia e a estrutura do quadro de telas usam utilities; vidro, cenário e conexões mantêm CSS específico. As fontes do build são explícitas, sem Preflight nem carregamento de Tailwind em runtime. Isso prepara o design, sem criar a aplicação.
