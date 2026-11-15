# Briefing: desenhar um quadro de fluxograma do Moodle IA

Você vai escrever UM arquivo de quadro em `flows/boards/<id>.mjs` usando o gerador `flows/lib.mjs`. Leia primeiro `flows/lib.mjs` e o quadro de referência pronto `flows/boards/q2.mjs` (Jornada principal): copie a forma dele. Rode `node build.mjs <id>` dentro de `flows/` até o relatório dar **0 issues**. Não altere `lib.mjs`, `build.mjs`, `q2.mjs` nem quadros de outros agentes. Não publique nada.

## O produto (resumo)

Moodle IA ajuda professores a transformar o planejamento da disciplina num curso Moodle (.mbz), matricular a turma (Alunos) e ajustar datas de um curso já publicado (Datas). Três ferramentas na ordem do semestre: Preparar curso (antes das aulas) · Alunos (na matrícula) · Datas (durante o semestre). Detalhes: `flows/specs/product.json`. A especificação do seu quadro está em `flows/specs/<id>.json` (nós, ligações e dica de layout). Siga o conteúdo e a lógica dela, com as adaptações abaixo, que têm prioridade.

## Adaptações obrigatórias (valem mais que a especificação)

- **Vocabulário:** use "pendência" (o que impede baixar o curso) e "Para ficar de olho" (aviso que não impede). Nunca "correção", que para o professor é correção de prova. "Para corrigir antes de baixar" vira "Para resolver antes de baixar". "Correção 1 de 3" vira "Pendência 1 de 3".
- **Fonte:** só Switzer (o gerador já faz). Nada de serifa.
- **Cores:** só os tokens de `T` em `lib.mjs` (verde de ação, laranja do Moodle só no que acontece no Moodle). Nada de azul "caneta", nada de fundo creme, nada de borda colorida à esquerda dos cartões.
- **Coruja:** só a marrom (`owlImg`, `planHeader` já usa). No máximo uma coruja grande por quadro, além da do cabeçalho.
- **Datas e horas:** formato brasileiro, horário de Brasília ("20 out, 23:59"). Nunca ISO, UTC ou número de revisão.
- **Sem IDs, rotas, nomes de arquivos de código ou status de implementação** em nenhum texto.
- Português do Brasil, frases curtas, voz ativa, "você". Rótulos de seta com no máximo 4 palavras, iguais ao botão do app.
- Botão que muda o Moodle: `kind: "moodleAction"` (borda dupla laranja e escudo), sempre depois de uma prévia.
- O que acontece fora do app, no Moodle: `kind: "outside"` dentro da faixa `b.moodleBand(y, h)`.
- Todo erro (`kind: "error"`) tem `houve`, `guardado` e `voltar`, e pelo menos uma seta `style: "back"` saindo dele para uma tela que funciona.

## Como usar o gerador

- `new Board({ file, title, width: 1600, height })`. Faixas: `LANES.E` (erros, x 64–344), `LANES.C` (caminho, x 424–784, eixo x 604), `LANES.O` (outras saídas, x 864–1144), `RAILS` (voltas pontilhadas, x 1184/1208/1232/1256), `LANES.N` (pontes, x 1296–1536). Para um quadro com layout próprio (ex.: o mapa geral), passe `x`, `y` e `w` explícitos nos nós; os mesmos checadores valem.
- Tipos: `screen` (tela; `stamp` "1", "2", "1a"), `decision` (pergunta, termina com "?"), `system` (o Moodle IA trabalhando, gerúndio + "…"), `error`, `end` (círculo; `moodle: true` com aro laranja), `interchange` (ponte para outro quadro ou passo compartilhado), `action`, `moodleAction`, `outside`, `note` (informação neutra).
- Estilos de seta: `main` (caminho principal), `alt` (escolha lateral), `error` (vai ao erro), `back` (volta do erro), `loop` (volta pontilhada), `moodle` (vai ao Moodle).
- Ligações: `b.edge({ from, to, fs, fa, ts, ta, via, label, labelSeg, labelLeft, labelAt, labelBelow, lx, ly })`. `fs`/`ts` = lado de saída/entrada ("t", "b", "l", "r"); `fa`/`ta` = posição em px a partir do topo (lados l/r) ou da esquerda (lados t/b); `via` = lista de `{x}` ou `{y}` para dobrar a seta. Voltas usam os `RAILS`; a volta mais longa usa o trilho mais externo e entra mais acima no cartão de destino.
- Use `b.below(id, gap)` para empilhar e `cy` para alinhar o meio de um cartão com o vértice de um losango (como `err_leitura` em q2). Prefira não fixar `h`: o gerador mede o texto. Se fixar, deixe folga.
- `b.divider(y, "Etapa")` antes de cada etapa, com os mesmos nomes da trilha do app. `planHeader(b, {...})` no topo (ficha "Plano de aula"). Ajuste `b.height` no fim (último elemento + 40).
- Extras: `caption`, `owlImg`, `lock`.
- O verificador acusa cartões a menos de 16px, setas que atravessam cartões, setas que se cruzam ou correm uma sobre a outra, rótulos sobre cartões ou setas, e coisas fora da margem. Resolva tudo mudando posições, lados (`fs`/`ts`/`fa`/`ta`) ou trilhos. Nunca encolha o texto para caber.

## Entrega

Responda com: o id do quadro, o tamanho final, quantos cartões e setas, o resultado do verificador (tem de ser 0 issues), e o que você mudou da especificação e por quê, em 3 a 6 linhas.
