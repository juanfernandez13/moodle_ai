# C01 — revisão independente de especificação

Task / role / agent ID: C01 / spec / `/root/contract_review_spec`.

Candidate revision: `sha256:de3007dfe7b205e936f89645e48495a45dc9d3592458367095c59f42cd289512`.

Base declarada: `64526fa7208179204666abc4d2939c3838edb0a8`.

Decisão: **pass**. Nenhum desvio funcional bloqueante observado nos critérios C1/C2 deste recorte.

## Identidade e escopo

Os sete SHA256 individuais foram recalculados e conferem com `docs/tasks/C01/candidate.json`. O digest agregado foi reproduzido como SHA256 dos bytes UTF-8 de `JSON.stringify(manifest.files)`, sem indentação ou quebra final, e coincide com a revisão acima. Os sete hashes foram conferidos novamente após a inspeção. Não houve operação Git nem edição do candidato.

Fontes consultadas: `AGENTS.md`, `.agents/skills/project-loop/SKILL.md`, `references/roles.md`, `docs/specs/FULL-01-application.md`, `docs/tasks/C01/context.md`, `docs/tasks/C01.json`, arquitetura e ticket V01-01. Foram revisados os quatro arquivos de domínio e os três arquivos de testes/evidência listados no manifest. CLI e fixture anteriores foram lidos apenas para verificar compatibilidade.

Esta decisão cobre o contrato de domínio aditivo. Emissão de conteúdo sem duplicação, presets portáteis, editor, importação, exportação e OPS dependem dos seus consumidores e não foram julgados aqui. O contrato representa strings e blocos preservados; a precedência de apresentação continua sendo responsabilidade dos consumidores.

## Evidência de execução

- `npm run check`: execução atual encerrada com **exit 0**, typecheck/lint/testes/build. `docs/tasks/C01/check.log` mostra **110 pass, 0 fail**; `docs/tasks/C01/check.exit.json` vincula comando, exit code e revisão. O término também foi confirmado pelo orquestrador a partir da sessão 68037. Não foi usado o resultado anterior como aprovação.
- Revisão executou um programa de sondagem em memória com `node --input-type=module` pela entrada padrão: **exit 0**, um caso válido completo e **29 casos inválidos**. Nenhum arquivo de fonte ou teste foi escrito. A execução verificou saída, caminho exato do erro e ausência de mutação da entrada em cada caso inválido.
- O caso válido independente incluiu todos os locais novos de blocos: resumo de metadados/seção, descrição de atividade, enunciado/feedback de questão, texto/feedback de alternativa, enunciado de par e definição de glossário; incluiu imagem decorativa com `alt: ''`, imagem repetida por anexo com IDs de ocorrência distintos e imagem/texto em tabela. A saída foi comparada por igualdade profunda à entrada e manteve ausentes `sessionAt` e `maxMark` não informados.
- Os 29 casos inválidos cobriram `keepDays` (-1/3651/fração), `sessionAt` sem fuso/data inexistente, enum de repetição, título wiki em branco, `entriesPerPage` (0/101/fração), `responseLines` (4/51/fração), anexos essay (-1/11/fração), `maxMark: 0`, carga horária zero, email inválido, alt com 2001 caracteres, 501 blocos, 101 linhas, 21 colunas, 101 blocos/célula, colisão global de ID de par/entrada/bloco de célula, anexo ausente em bloco de par e categoria apontando para chat. Todos foram rejeitados no caminho esperado.

## Resultado por critério

| Critério / requisito fixado | Resultado | Evidência |
| --- | --- | --- |
| C1: seis módulos e opções explícitas | Satisfeito | `schema.ts:32–49` define união forum/assignment/quiz/chat/wiki/glossary; chat/wiki/glossary têm objetos estritos e limites do modelo. Teste permanente `expanded-draft.test.ts:25`; sondagens independentes de opções inválidas. |
| C1: três questões, feedback e peso opcional positivo | Satisfeito | `schema.ts:18–27`: multiple-choice/matching/essay, campos comuns preservados, `maxMark` opcional positivo. Regras de resposta única anteriores em `rules.ts:77–85`. Caso independente conserva ausência do peso e rejeita zero. |
| C1: metadados aditivos | Satisfeito | `schema.ts:54–64`: versão 1 mantida, teacher/workloadHours/semester/className opcionais, tipos estritos. Caso válido independente inclui todos; carga zero e email inválido são localizados. |
| C1: blocos seguros, tabelas, imagens e limites | Satisfeito | `schema.ts:11–17`: text/image/table, célula restrita a text/image, limites 500/100/20/100 e alt até 2000. Campo `html` é rejeitado pelo teste permanente `expanded-draft.test.ts:39–46`. Sondagens independentes confirmam os excessos e todos os locais de blocos. |
| C1: IDs globais e anexos por ID | Satisfeito | `rules.ts:26–41`, `44–53`, `74–95`, `99–103`: registro global inclui blocos internos, pares, entradas e entidades anteriores; imagem resolve somente anexo declarado. Colisões e anexo ausente foram reproduzidos com caminhos exatos. |
| C1: categorias somente assignment/quiz | Satisfeito | `rules.ts:111–113`; teste anterior rejeita fórum e sondagem independente rejeita chat. Nenhuma categoria é inventada. |
| C2: fixtures e CLI anteriores | Satisfeito | Fixture v1 aceita sem campos novos; testes anteriores continuam no check atual. Os nove testes CLI cobrem exemplo válido com seis atividades, fixtures inválidas, limites e códigos de saída. |
| C2: preservação da entrada, IDs, caminhos e ausência de defaults | Satisfeito | `validate-draft.ts:23–55` usa parse estrito sem transform/default e devolve draft só após validação. Testes v1 verificam cópia, igualdade, reordenação, ausência de defaults e entrada inválida imutável. Caso ampliado independente confirma igualdade e ausência de defaults novos; 29 falhas mantêm a entrada e o caminho esperado. |
| F1 aplicável ao C01: typecheck/lint/testes/build e ferramentas anteriores | Satisfeito | Check atual exit 0, 110 testes; scripts e testes de CLI preservados. |

A instalação limpa de toda a aplicação e o aceite F1 completo pertencem à integração FULL-01. Este recorte não altera manifest/lockfile e a evidência examinada é de `npm run check`, não de uma instalação limpa nova.

## Achado não bloqueante

**S1 / P3 — conservar regressões específicas da expansão na suíte permanente.** Local: `tests/domain/expanded-draft.test.ts:25–46`. Os três testes atuais comprovam aceitação ampla, colisão de bloco/imagem e um campo HTML desconhecido, mas não persistem os limites dos settings novos, os quatro limites de blocos/tabelas, colisões de pares/entradas e imagens nos demais locais. O comportamento atual foi confirmado pelas sondagens desta revisão; o risco é regressão futura sem falha da suíte. Ação sugerida: acrescentar casos de interface pública para os extremos inválidos acima e para igualdade profunda do draft ampliado, incluindo caminhos exatos. Exemplo reproduzido: `chat.settings.keepDays = 3651` retorna erro em `sections[0].activities[6].settings.keepDays`; um par com ID igual ao curso retorna `duplicate_id` no `.pairs[0].id`. Sugestão separada de bloqueio funcional.

Dependencies or uncertainty: CodeGraph indisponível conforme o pacote de contexto; revisão feita por inspeção e execução local. Compatibilidade/restauração Moodle e os demais eixos FULL-01 não são afirmados por este relatório. A revisão de qualidade deve ocorrer em contexto independente sobre a mesma revisão.
