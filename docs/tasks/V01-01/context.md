# Contexto V01-01

Guardião somente leitura: `/root/context_guardian`. Integrador: `/root`. Executor de domínio: `/root/domain_executor`. Fontes na raiz original `C:/Users/juanp/Projetos/Moodle/Moodle-AI`. Base Git confirmada por consulta elevada somente leitura: `fd7ad9414c4aefc99719b42823790a2ffc381488`; `git status --short` sem saída (limpo). No sandbox a mesma consulta falha como worktree indisponível.

O usuário pediu início da execução/criação e confirmou Moodle-AI em 12/10/2026. A liberação substitui o bloqueio anterior de implementação. AGENTS, PRD, arquitetura, backlog, plano ampliado e readiness foram lidos. Primeiro ticket: CLI de validação, não V01 inteiro nem MVP.

Invariantes: contrato versionado único, várias atividades por seção, IDs estáveis, anexos por ID sem caminhos físicos, validação runtime, dados fictícios, sem IA/rede/Moodle no domínio e sem alteração de CourseGen-AI. Persistência escolhida no navegador e portabilidade completa permanecem na versão completa. Editor seguirá Next/Tailwind e a direção existente.

CodeGraph MCP indisponível; CLI `status` saiu 1 com banco inacessível. Inspeção local usada. Docker CLI 27.3.1 disponível, contexto desktop-linux; consulta do servidor saiu 1 porque pipe dockerDesktopLinuxEngine ausente. Não foi iniciado serviço. Alvo/inventário de referência 4.1.17+, build 20250321; nenhum lab/restauração comprovados.

Propriedade: executor de domínio escreve somente src/domain/course, tests/domain, tests/fixtures no staging. Integrador escreve CLI/tests de CLI, config e docs. Staging dentro de work permite revisão/checagem antes de integrar os mesmos arquivos na raiz original; não é outro repositório ou produto.

Verificação fixada pela spec: TDD no validateDraft e CLI; npm ci, typecheck, lint, testes, build, demo e código compilado; digest do candidato; dois revisores em contextos distintos, somente leitura. Artefatos/candidatos não incluem dependências ou dados pessoais. Até duas correções.
