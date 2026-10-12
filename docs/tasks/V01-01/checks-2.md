# Verificação após correção A4

Candidato: `sha256:066e9800d6a124ecb1d01bd3baa8db885d08dbd98f9c80b6b343b6d7e9329a4f`, 35 arquivos em candidate.json. Integrador `/root`; Node 24.19.0, npm 11.17.0, Windows.

O primeiro candidato e sua revisão com changes-requested estão preservados em candidate-1.json, checks.md e review-quality-1.md. A correção modificou rules.ts e o teste público do domínio; contrato, schema, configuração, package.json e lockfile permaneceram iguais. Evidência RED/GREEN complementar em tests/domain/tdd-evidence.txt: 97/98 antes, 98/98 depois.

| Check real | Resultado observado |
| --- | --- |
| npm ci --ignore-scripts --no-audit --no-fund | Instalação limpa exit 0 registrada em checks.md; lockfile/dependências inalterados nesta correção. Será repetida no destino de integração. |
| npm run check | exit 0; typecheck, lint, 107 testes/107 pass/0 fail e build concluídos |
| npm run demo | exit 0; valid=true, revision=3, sections=1, activities=6, attachments=3 |
| Comparação fonte/compilado com spawnSync e assert | stdout, stderr e status idênticos nas quatro fixtures; válida exit 0, três inválidas exit 1 |
| inspect-candidate.mjs | exit 0; 35 hashes e digest conferidos; 171 links relativos existentes em staging ou destino preservado; fences balanceados |
| Ferramentas anteriores | design:css e codegraph:init/status/serve, CodeGraph 1.6.2 preservados |

Revisões independentes devem receber esta revisão exata. A entrada não foi reescrita nos testes das três fixtures inválidas. O novo teste de datas exercita `validateDraft` com ordem inversa/correta/igual, fusos equivalentes, frações de comprimentos distintos, ausência de fração e fronteira entre segundos.

Estes resultados cobrem V01-01. Não comprovam bytes dos anexos, renderização HTML, exportação MBZ ou restauração. Docker Lab permanece indisponível pela ausência do daemon Linux; não afeta a execução deste ticket.
