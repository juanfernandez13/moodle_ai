# V01-01 — Validar um rascunho fictício por comando local

**Spec:** [V01](../specs/V01-course-to-mbz.md). **Blocked by:** nenhum. **Status:** acompanhar [registro JSON](../tasks/V01-01.json). **Responsável:** integrador `/root`, executor de domínio separado.

Uma pessoa instala as dependências locais pelo lockfile, executa um exemplo sem IA e recebe contagens ou pendências por campo. Uma entrada inválida não é alterada nem tratada como pronta para exportação.

- [ ] A1–A8 da spec passam, com comandos e revisões no mesmo candidato.
- [ ] Fixture válida preserva seis atividades, IDs e vínculos.
- [ ] Três fixtures inválidas e falhas de CLI produzem códigos/saídas documentados.
- [ ] Código fonte e compilado têm comportamento equivalente.

Verificação: `npm ci`, `npm run check`, `npm run demo` e `node dist/cli/validate-draft.js tests/fixtures/course-valid.json`. Nenhum editor ou pacote MBZ é anunciado como entregue por este ticket.
