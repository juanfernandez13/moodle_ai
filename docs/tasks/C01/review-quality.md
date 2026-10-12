# C01 — revisão independente de qualidade

Task / role / agent ID: C01 / quality / `/root/contract_review_quality`.
Candidate revision: `sha256:de3007dfe7b205e936f89645e48495a45dc9d3592458367095c59f42cd289512`.
Base declarada no manifesto: `64526fa7208179204666abc4d2939c3838edb0a8`.
Result: **pass**.
Bloqueios reais: **nenhum identificado neste recorte**.

## Independência e integridade

Revisão local de snapshot, sem participação na implementação, sem consulta ao parecer de especificação e sem uso de Git. Foram lidos AGENTS.md, project-loop/SKILL.md e seus contratos de papéis/roteamento, os contratos FULL-01 e V01, decisões relevantes da arquitetura, C01.json/context.md/candidate.json e os registros de check. O parecer cobre exatamente os quatro arquivos src/domain/course, os dois arquivos de teste e full-tdd-evidence.txt enumerados no manifesto. Nenhuma fonte foi alterada.

SHA256 de `JSON.stringify(manifest.files)`, UTF-8 sem LF final, confirmou a revisão acima. Os sete SHA256 dos bytes reais também coincidiram com o manifesto:

| Arquivo | SHA256 confirmado |
| --- | --- |
| src/domain/course/index.ts | e6406bbeab4469dbedd860e07e202878c007c66b6071a143723a34513d5568df |
| src/domain/course/schema.ts | 04e78d307f47d2e64df0e5f8e372926cafae47f4050d1d4d66fef921932296ab |
| src/domain/course/rules.ts | 4d0004ab64b732a322a31a7bbb60c9b5a51cf77f01f54d88a191f76f25d0f4d3 |
| src/domain/course/validate-draft.ts | a20ffa47e85f99d71a73ebac05f7dfa6374177c4d2236e761c66251b29e4722d |
| tests/domain/validate-draft.test.ts | 1711c591a6f9c6839f19fa60fc5acf681d74c120328029550332b1f597af7e20 |
| tests/domain/expanded-draft.test.ts | 4b24a419e7bf545e3cd9a39f394a5278f4ddd710a527f03a28fc7218412ada68 |
| tests/domain/full-tdd-evidence.txt | 9ede9ff646fa1b0ed5e3cb0d836f0c24924a7934ed6dc478e14b3f549af08c05 |

## Evidências executadas e inspecionadas

- `docs/tasks/C01/check.log` e `check.exit.json`: npm run check, saída 0; typecheck/lint, 110 testes aprovados e build. Esse gate foi inspecionado, sem repetir instalação/build ou escrever seus artefatos.
- `node --test --test-reporter=dot tests/domain/*.test.ts`: execução independente, saída 0, 101 testes de domínio aprovados, Node v24.19.0.
- `node src/cli/validate-draft.ts tests/fixtures/course-valid.json` e `node dist/cli/validate-draft.js tests/fixtures/course-valid.json`: ambas saíram 0 com resultado idêntico, revisão 3, 1 seção, 6 atividades e 3 anexos, sem conteúdo do curso na saída.
- Script Node via stdin, apenas em memória, com assert na interface pública validateDraft: 87 sondagens aprovadas, incluindo 79 entradas inválidas. Cobriu novos enums/booleanos/datas, intervalos de chat/glossary/essay, maxMark, teacher/email/workloadHours, texto obrigatório, limites inclusivos/excedidos de blocos/linhas/colunas/células/alt, campo extra em estruturas novas, referências de imagens em diversos níveis, IDs globais em todos os novos caminhos, categorias apontando para chat/wiki/glossary, reordenação, retorno determinístico e preservação da entrada inclusive congelada. Não foram criados arquivos de sondagem.
- O registro full-tdd-evidence.txt discrimina duas falhas comportamentais RED, uma falha ambiental que não conta como RED e o GREEN posterior. É evidência histórica complementar; esta revisão confirmou o estado atual, sem reconstruir a execução anterior.

## Avaliação de qualidade

Contratos e manutenção: a união discriminada mantém os campos v1 e acrescenta os tipos coordenados. Os schemas novos são strictObject em todos os níveis; os tipos públicos são inferidos do mesmo schema. Validação estrutural antecede regras de referências, evitando percorrer entrada malformada. O domínio depende apenas de Zod e funções puras, sem filesystem, relógio, rede ou SDK de IA. Cancelamento e limpeza de temporários não se aplicam à função síncrona pura deste recorte.

IDs/referências e tabelas: rules.ts:26–43 registra cada bloco e percorre células, mantendo IDs globalmente únicos inclusive dentro das tabelas. rules.ts:71–96 cobre questões, opções, pares e entradas. Imagens são resolvidas contra anexos declarados, sem confundir a ocorrência do bloco com o ID do anexo. schema.ts:13–17 permite apenas text/image dentro de células e limita cada lista/tabela/célula conforme o contrato. As sondagens confirmaram rejeição de tabela dentro de célula e diagnóstico de ID/referência no caminho completo.

Segurança e falhas: os erros públicos usam mensagens fixas, caminhos localizados e não incorporam valores rejeitados; dados inválidos não publicam draft. Campos físicos, secretos ou html desconhecidos são rejeitados também nas estruturas novas. Texto continua texto simples: a validação não promete sanitização HTML, resolução de bytes ou compatibilidade Moodle. A CLI conserva limite de 1 MiB, saídas e diagnóstico do contrato anterior, conforme fonte e gate registrado.

Compatibilidade/preservação: fixtures v1 e CLI anterior continuam válidos. A validação produz cópia sem defaults, trim ou mutação. As sondagens de conteúdo rico preservaram strings com espaços, ocorrências e listas; entrada profundamente congelada foi aceita. Repetir a validação devolveu resultado equivalente. A revisão não verificou instalação limpa nem restauração Moodle, que não pertencem ao aceite isolado C01.

## Melhorias não bloqueantes

- **P3 — mensagem de discriminador genérica demais**, src/domain/course/validate-draft.ts:38. Reproduzido ao atribuir `kind: 'html'` a metadata.summaryBlocks[0]: o erro vem corretamente como invalid_union em `metadata.summaryBlocks[0].kind`, mas a mensagem é “Informe um tipo de atividade aceito por esta versão do contrato.” O campo é um bloco, não uma atividade; questões e células compartilham a mesma mensagem. Uma mensagem neutra sobre o tipo de conteúdo ou selecionada pelo caminho seria mais acionável. A entrada é rejeitada corretamente, portanto isso não bloqueia C1/C2.
- **Cobertura persistida da expansão**, tests/domain/expanded-draft.test.ts:25–45. Os três testes novos agrupam o caminho válido, dois problemas de domínio e um campo extra. Seria útil persistir casos representativos de limites, ID duplicado dentro de célula e colisões de pares/entradas como regressões públicas. As sondagens independentes cobriram esses casos e não encontraram falha atual; trata-se de melhoria de proteção contra regressões, não de defeito demonstrado.

Dependencies or uncertainty: CodeGraph indisponível segundo o contexto; inspeção local realizada. A base Git é metadado declarado, sem validação por Git neste papel. Este pass cobre qualidade do candidato C01 e não aprova editor, importação, exportação, transporte de anexos ou restauração Moodle.
