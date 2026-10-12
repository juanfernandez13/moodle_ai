# Acompanhamento local

Decisão de rotina da execução autorizada em 12/10/2026: Markdown por ticket em `docs/tickets/`, specs em `docs/specs/` e registros/evidências do `project-loop` em `docs/tasks/`. Índice: [tickets](../tickets/README.md).

Estados textuais: planned (contrato/dependências ainda abertos), ready-for-agent (contrato e dependências satisfeitos), executing; aceitação e integração seguem o registro JSON quando presente. blocked-environment é anotação do tracker para dependência ambiental, não estado adicional do helper.

Antes de delegar, fixar contrato, proprietário por caminho, aceites e checks. Registros JSON possuem os estados do helper instalado, duas revisões separadas e limite padrão de duas correções. Somente integrador atualiza os registros; resultados de agentes devem ser inspecionados.

Esta configuração não afirma execução de `setup-matt-pocock-skills`, `to-spec`, `to-tickets` ou publicação de issues. Um serviço externo só entra por solicitação do mantenedor.
