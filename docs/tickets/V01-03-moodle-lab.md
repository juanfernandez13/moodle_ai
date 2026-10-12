# V01-03 — Preparar laboratório Moodle isolado e reproduzível

**Spec:** [V01](../specs/V01-course-to-mbz.md). **Blocked by:** daemon Docker/WSL disponível; alvo, plugins/formato e versões do ambiente fixados. **Status:** blocked-environment. **Responsável previsto:** executor laboratório.

Uma pessoa inicia Moodle local com banco/moodledata isolados, dados fictícios e reset documentado, sem depender de uma instância institucional.

- [ ] Fixar revisão de moodlehq/moodle-docker, Moodle, PHP, banco e imagens, com conjunto de plugins/capacidades necessário.
- [ ] Documentar porta, prontidão, credenciais fictícias, e-mail capturado e reset restrito ao lab.
- [ ] CLI de restauração da versão escolhida tem flags verificadas por `--help`.
- [ ] Instalação limpa reproduz o ambiente e registra sua versão efetiva.

Em 12/10/2026, CLI Docker 27.3.1 presente e engine Linux indisponível. Não é defeito do domínio/CLI e não bloqueia V01-01. A referência recebida 4.1.17+ / 20250321 não precisa ser solicitada novamente.
