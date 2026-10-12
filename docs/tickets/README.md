# Tickets de execução

Tracker local do Moodle-AI, iniciado em 12/10/2026. Um arquivo por ticket, dependências explícitas e evidências no registro JSON. A criação destes tickets usa o `project-loop` local; não afirma execução dos workflows upstream `to-spec`/`to-tickets`.

| Ticket | Entrega | Bloqueado por | Estado inicial |
| --- | --- | --- | --- |
| [V01-01](V01-01-bootstrap-validation.md) | JSON → validação e diagnósticos executáveis, com ambiente reproduzível | Nenhum | [registro JSON](../tasks/V01-01.json) |
| [V01-02](V01-02-export-mbz.md) | Draft validado → MBZ e inspeção de conteúdo/referências/arquivos | V01-01 e contrato do exportador fechado | planned |
| [V01-03](V01-03-moodle-lab.md) | Moodle Lab isolado/fixado, acessível e com reset documentado | Daemon Docker acessível e inventário/alvo fixados | blocked-environment |
| [V01-04](V01-04-restore-fixture.md) | MBZ → restauração e comparação semântica independente | V01-02, V01-03 | planned |
| [V02-01](V02-01-manual-editor.md) | Criação manual → editor → validação → download | V01-02 e spec de editor detalhada | planned |

Somente tickets com dependências satisfeitas e contrato fechado recebem `ready-for-agent`. `blocked-environment` é estado informativo do tracker, não uma transição inventada do helper `project-loop`.

V01-01 inicia a execução e não conclui V01. V01-02 precisa de investigação/adaptação do legado e sua própria especificação de exportação antes de delegação. V02–V07 seguem o [backlog](../BACKLOG.md); B03–B10 do [plano ampliado](../BUILDER_PIPELINE_PLAN.md) representam a versão completa.
