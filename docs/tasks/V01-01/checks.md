# Verificação do candidato V01-01

Candidato: `sha256:cb482fca072b05dab0a6ec2ae1b418c89f48f2eda466a7d70491ae46259057c6` (35 arquivos; regra e hashes em candidate.json). Node 24.19.0 / npm 11.17.0 / Windows. Integrador `/root` inspecionou resultados reais.

| Comando/inspeção | Resultado observado |
| --- | --- |
| npm ci --ignore-scripts --no-audit --no-fund (cache local, retries 0) | exit 0, 100 dependências instaladas pelo lockfile; scripts de terceiros não executados |
| npm run check | exit 0: typecheck sem diagnóstico, lint sem diagnóstico, 106 testes/106 passed/0 fail, build TypeScript concluído |
| npm run demo | exit 0; valid=true, revision=3, sections=1, activities=6, attachments=3 |
| node dist/cli/validate-draft.js tests/fixtures/course-valid.json | exit 0, mesmo resultado |
| Comparação por spawnSync da CLI fonte e compilada | saídas 0, stdout idêntico; assert passou |
| Inspeção do manifesto/docs | hashes e digest conferidos, 171 links relativos existentes em staging ou destino preservado, fences balanceados |
| Preservação do package.json anterior | design:css e codegraph:init/status/serve, CodeGraph 1.6.2 mantidos |

Após `npm run check`, somente a redação de A8 na spec foi esclarecida para distinguir aceitação de comprovação da integração. Código, tests, configuração e lockfile permaneceram byte a byte iguais; o manifesto final e a inspeção documental refletem a redação atual. Nenhum check de código foi invalidado por essa clarificação documental.

TDD: evidências do executor em tests/domain/tdd-evidence.txt e da CLI em cli-tdd.md. Ciclos agrupados são descritos com precisão; não há alegação de um ciclo individual por cada um dos 106 testes. Testes exercitam validateDraft e o processo CLI.

Nenhum resultado comprova bytes de anexos, HTML seguro, MBZ, editor, IA ou restauração. Essas etapas permanecem tickets próprios. CodeGraph MCP não exposto, CLI sem banco acessível; inspeção local. Docker Lab indisponível por daemon Linux ausente.
