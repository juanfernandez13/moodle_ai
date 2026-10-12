# Tickets de execução

Tracker local do Moodle-AI, iniciado em 12/10/2026. Um arquivo por ticket, dependências explícitas e evidências no registro JSON. A criação destes tickets usa o `project-loop` local; não afirma execução dos workflows upstream `to-spec`/`to-tickets`. A implementação ampliada e a revisão coordenada estão no registro [FULL-01](../tasks/FULL-01.json); seu estado é a autoridade de aceite/integração.

| Ticket | Entrega | Dependências | Estado atual / evidência |
| --- | --- | --- | --- |
| [V01-01](V01-01-bootstrap-validation.md) | JSON → validação e diagnósticos executáveis, com ambiente reproduzível | Nenhum | [registro JSON](../tasks/V01-01.json) |
| [V01-02](V01-02-export-mbz.md) | Draft validado → MBZ e inspeção de conteúdo/referências/arquivos | V01-01 e contrato do exportador fechado | Executado sob FULL-01; testes em `tests/export` e restauração em [Lab](../lab/README.md) |
| [V01-03](V01-03-moodle-lab.md) | Moodle Lab isolado/fixado, acessível e preservação dos dados documentada | Daemon Docker acessível e inventário/alvo fixados | Bloqueio ambiental inicial resolvido; Moodle oficial 4.1.17 local, versões/digests em [Lab](../lab/README.md) |
| [V01-04](V01-04-restore-fixture.md) | MBZ → restauração e comparação semântica independente | V01-02, V01-03 | Quatro restaurações fictícias e comparação independente em `docs/lab` |
| [V02-01](V02-01-manual-editor.md) | Criação manual → editor → validação → download | V01-02 e spec de editor detalhada | Executado sob FULL-01; editor/persistência em `tests/client`, jornada registrada pelo integrador |

Somente tickets com dependências satisfeitas e contrato fechado recebem `ready-for-agent`. `blocked-environment` é estado informativo do tracker, não uma transição inventada do helper `project-loop`.

As descrições iniciais nos tickets são histórico de planejamento. O contrato [FULL-01](../specs/FULL-01-application.md) fechou a expansão antes da delegação, incluindo importação, seis módulos/três questões, editor, persistência, alunos e datas. [OPS-01](../specs/OPS-01-moodle-adapter.md) limita operações ao laboratório local. V07 público permanece uma etapa própria: esta execução entrega aplicação local, sem publicação ou promessa de suporte a outras instalações. Nunca usar o Moodle do IFCE.
