Moodle IA ajuda professores e equipes pedagógicas a transformar o planejamento de uma disciplina em um curso Moodle pronto para importar, a matricular a turma e a ajustar as datas durante o semestre. A interface é organizada como a agenda de quem dá aula: o que se faz antes das aulas, na matrícula e durante o semestre. Quem usa é professor, não programador. Desenhe cada tela para alguém mais velho que chega sem contexto: ele precisa ver logo o que fazer, sem ler um parágrafo.

## Princípios

1. **O curso é o protagonista.** Disciplina, unidades e atividades ocupam a tela. Cor, coruja e tipografia orientam; nada enfeita.
2. **Pouco texto.** Pense num idoso sem contexto: título de 2 a 4 palavras, no máximo uma linha curta de ajuda por bloco, um botão principal por etapa, passos numerados e nenhum jargão. Se a tela precisa de um parágrafo para se explicar, a tela está errada.
3. **Fale como um colega de escola.** Termos do professor e do Moodle, nunca do sistema (build, revisão, perfil, MiB, UTC, fuso, alvo, cadência).
4. **Uma coisa por vez.** Uma ação principal por etapa, um passo de cada vez, e cada pendência leva direto ao campo.
5. **Nenhum erro sem saída.** Todo erro diz o que houve, o que fica guardado e como voltar (RecoveryCard).
6. **O Moodle só muda com confirmação.** Antes de qualquer mudança no Moodle há uma prévia ("Nada foi alterado ainda") e um botão `mi-btn-moodle` com o número do que vai mudar.

## Mapa do produto

- **Início** pergunta "O que você quer fazer hoje?" e guarda **Seus cursos** (CourseCard).
- **Criar disciplina** (antes das aulas): ao lado do título, a alternância **Importar arquivos | Criar manualmente** (Tabs); embaixo, os passos **1 Arquivos · 2 Revisão · 3 Baixar** (Trail).
  - Importar arquivos: a **Matriz** (um arquivo só, botão "Enviar arquivo"), **Tarefas** e **Quizzes** (áreas de arrastar vários arquivos) (UploadGroup) e a coluna da **Inteligência artificial** com o botão principal "Enviar para análise" (AiSelect).
  - No rodapé, só dois links: "Importar JSON" e "Copiar prompt". "Ver exemplo" fica dentro de Importar JSON.
  - A Revisão acontece no **Caderno do curso**: Sumário (UnitNav) à esquerda, a página aberta no centro, "Para resolver antes de baixar" (IssueList) à direita.
  - Não ponha na entrada a opção "Sem IA" (é o mesmo que Criar manualmente), a escolha "Organizado por tópicos ou semanas" (a IA descobre pelo documento e você muda depois no Caderno) nem o botão "Ver seus últimos cursos" (Seus cursos fica no Início).
- **Cadastrar alunos** (na matrícula): **Enviar planilha | Preencher à mão**; passos 1 Alunos · 2 Conferir · 3 Enviar. A planilha e a tabela à mão têm as mesmas colunas da planilha de exemplo: Nome completo, E-mail, CPF e Curso. O link "Baixar modelo" fica junto de Enviar planilha.
- **Ajustar datas** (durante o semestre): um assistente de quatro passos, **1 Entrar no Moodle · 2 Escolher o curso · 3 Novas datas · 4 Conferir**. Novas datas faz só duas perguntas: "Quando o curso começa?" e "Cada unidade dura quantos dias?". Conferir mostra antes e depois e termina em "Aplicar 24 mudanças". "Testar sem o Moodle" é um link no topo, não um passo.
- **Entrar no Moodle** vale para Alunos e Datas: quem entrou em um já está conectado no outro. A senha nunca é guardada.
- As três ferramentas são independentes. A fita do cabeçalho mostra a ordem do semestre e não obriga nenhuma ordem.

## Voz e escrita

- Trate a pessoa por "você". Frases curtas, voz ativa, português do dia a dia.
- Títulos de 2 a 4 palavras: "Criar disciplina", "Cadastrar alunos", "Novas datas". Quando o passo pede uma resposta, pergunte: "Quando o curso começa?".
- No máximo uma linha de ajuda por bloco. O que não couber vai para "Como funciona", no menu Mais.
- Sentence case em títulos e botões: "Adicionar unidade", não "Adicionar Unidade".
- Botões começam com verbo e dizem o resultado: "Enviar para análise", "Baixar curso (.mbz)", "Aplicar 24 mudanças".
- Sem emoji. Exclamação só na comemoração "Seu curso está pronto!".
- Datas em dd/mm/aaaa ou "20 out, 23:59", horas em 24h, no horário de Brasília. Não mostre nem pergunte o fuso. Tamanhos em KB e MB.
- Estados em texto humano: "Salvo neste navegador há 1 minuto", "Conferido às 14:32". Nunca "revisão 347".
- "JSON" só aparece no link "Importar JSON" do rodapé da entrada, para quem já usa outra IA. Em nenhum outro lugar.
- Detalhes técnicos ficam no menu Mais, em "Limites e compatibilidade".

| Em vez de | Escreva |
| --- | --- |
| Perfil testado no laboratório Moodle 4.1.17, build 20250317. Outras versões não foram verificadas. | Testado no Moodle 4.1 (laboratório). |
| Salvo neste navegador · revisão 0 | Salvo neste navegador há 1 minuto |
| Estrutura válida | Tudo certo para conferir |
| Conferir revisão | Conferir o curso |
| Fórum: novo conteúdo | Fórum sem título |
| Quem vai ler? Sem IA, no seu computador | Criar manualmente |
| Organizado por: Tópicos ou Semanas | (nada na entrada: a IA descobre pelo documento) |
| Planejamento da disciplina (obrigatório) | Matriz |
| Iniciar processamento | Enviar para análise |
| Até 10 MiB por arquivo, 20 MiB e 10 arquivos no total. | Até 10 arquivos, com no máximo 10 MB cada. |
| Cadência: 7 dias · Fuso: America/Sao_Paulo | Cada unidade dura quantos dias? 7 |
| 24 alvos selecionados | Aplicar 24 mudanças |
| Backup pronto | Seu curso está pronto! |

### Vocabulário

| Palavra | Uso |
| --- | --- |
| Curso | O que vai para o Moodle. "Disciplina" só em "Criar disciplina" e "Sobre a disciplina". |
| Matriz | O planejamento da disciplina. Sempre um único arquivo (Word, PDF ou .txt), enviado pelo botão "Enviar arquivo"; outro arquivo substitui o primeiro. |
| Tarefas, Quizzes | Arquivos de apoio, opcionais e em qualquer quantidade: arraste na área ou use "Escolher arquivos". |
| Inteligência artificial | O select que diz quem lê a Matriz. Cada IA com chave aparece com a origem da chave: "Gemini · chave do servidor". "Adicionar chave…" abre uma janelinha, e a chave fica só nesta aba. |
| Criar manualmente | Começar sem arquivos e sem IA. É o que antes se chamava "Sem IA". |
| Unidade | A palavra genérica. Cada uma se chama "Semana 2" ou "Tópico 2", como o documento mostrar; dá para trocar no Caderno. |
| Atividade | Fórum, Tarefa, Quiz, Chat, Wiki ou Glossário, com esses nomes. |
| Pendência | O que impede baixar o curso. Não use "correção": para o professor, correção é de prova. |
| Para ficar de olho | Aviso que não impede. |
| Arquivo do curso (.mbz) | O pacote que o Moodle restaura. Explique uma vez: "o arquivo que o Moodle sabe restaurar". |
| Cópia no computador (.moodleai) | O curso guardado para continuar depois em outro navegador. |
| Prévia | O que o Moodle vai fazer, antes de fazer. Em Datas é o passo Conferir. Vale uma vez. |

## Cor

- O fundo é a folha de caderno (PageBackground): `page` com a pauta em `notebook-line` e a margem em `notebook-margin`. Sobre ela, painéis de vidro em `glass` com borda `glass-line` (ver Superfície). Dentro deles, campos, tabelas e cartões em `surface`; apoio em `surface-soft`; item escolhido em `selected`.
- Texto em `ink`; ajuda e metadados em `ink-muted`. Os dois passam de 5:1 em `page`, `surface`, `surface-soft` e `selected`, e de 7:1 sobre `glass`, nos dois temas.
- `action` é o verde da ação e do caminho principal. Texto sobre ele é `on-action`.
- Estados: `error` + `error-soft` bloqueia; `warning` + `warning-soft` pede atenção; `info` + `info-soft` informa; sucesso usa `action` sobre `selected`. Toda mensagem leva ícone e texto.
- Laranja do Moodle só para o que acontece no Moodle: `moodle-soft` na faixa "No seu Moodle", `moodle-ink` no texto dela, `moodle-line` na borda dupla de `mi-btn-moodle`, `moodle` em marcas pequenas. Nunca como cor de ação.
- Cada tipo de atividade tem `<tipo>-ink`, `<tipo>-soft` e `<tipo>-line`. Só em ActivityBadge e marcas do mesmo tipo.
- `owl`, `owl-soft` e `owl-ink` são da coruja: a fala dela e a ficha "Plano de aula" dos fluxogramas. `mint` fica para a capa e ilustração.

## Tipografia

- Uma família só, sem serifa: **Switzer** (Fontshare, variável 100–900, normal e itálico). Clara e neutra, deixa a voz do produto para a coruja, a cor e o texto.
- Pesos leves: títulos 600, rótulos e botões 500, texto 400. Nada em 700, nem o nome do produto.
- Hierarquia por tamanho: `display` (34px) uma vez por tela, para o nome do curso ou a pergunta do Início; `title` (27px) para página ou etapa; `heading` (21px) para seções; `subheading` (17px) para grupos e títulos de cartão. Todos em 600.
- `body` 16/25 (400) para texto corrido; `body-strong` (500) para nomes de atividade e de arquivo; `label` (500) para rótulos, botões, abas e passos; `small` (400) para ajuda e metadados; `caption` (500) só em etiquetas.
- A fala da coruja (`voice`) é Switzer itálico 400, em `owl-ink` sobre `owl-soft`. É o único itálico da interface.
- Títulos grandes levam espaçamento negativo (-0.02em a -0.025em). Texto corrido nunca.
- Números dentro de círculos (passos, Sumário, carimbos, contadores) em 500 com `tabular-nums` e `line-height: 1`, centralizados no círculo com flex.
- Sem fontes serifadas. Nada abaixo de 12px.
- A Switzer segue a ITF Free Font License: servida sem alteração pelo próprio app, nunca dentro do .mbz ou do conteúdo do curso, nunca num repositório público. Mantenha este design system privado ou só dentro da equipe.

## Espaço e forma

- Espaçamento em múltiplos de 4: `space-3` entre rótulo e campo, `space-4` dentro de itens, `space-6` dentro de cartões, `space-8` entre seções.
- Cantos: `radius-card` em painéis e cartões, `radius-control` em campos e itens, `radius-badge` em etiquetas, `radius-pill` em botões. Números ficam em círculos.
- Linhas de 1px, bem suaves: `line` em cartões, divisores e itens; `control-border` em campos e botões secundários; `glass-line` no vidro. Nada de bordas de 1,5 ou 2px. Os 2px ficam só para o anel de foco.
- Tracejado só de 1px e só onde se arrasta arquivo (`mi-drop`) ou num passo desatualizado da trilha.

## Superfície

- O fundo de todas as telas é uma folha de caderno parada (PageBackground, classe `mi-page`): pauta em `notebook-line` a cada 32px e margem em `notebook-margin` a `notebook-margin-x` da esquerda. Nada se move no fundo.
- Sobre a folha, painéis de vidro (`mi-card`, `mi-panel`): fundo `glass` (claro `rgba(255,255,255,0.62)`, escuro `rgba(28,48,37,0.66)`) com `backdrop-filter: blur(3px) saturate(1.1)` e borda de 1px em `glass-line` (claro `rgba(255,255,255,0.75)`, escuro `rgba(214,244,224,0.22)`). O desfoque é leve de propósito: a pauta do caderno continua visível através do painel. Não aumente o blur.
- Campos, tabelas e cartões internos continuam opacos, em `surface`: a Matriz e as áreas de arrastar, a janelinha da chave, ActivityRow, CourseCard. Texto denso nunca fica sobre transparência.
- Sem suporte a `backdrop-filter`, ou com `prefers-reduced-transparency: reduce`, `prefers-contrast: more` ou `forced-colors: active`, o painel fica opaco: `surface` com borda `line`. O bundle.css já faz isso.
- Um nível de vidro só: nunca vidro dentro de vidro. Sem paisagem, partículas ou 3D.
- `shadow-card` só em painéis e cartões sobre a folha; `shadow-pop` em menus, calendário e janelas, como "Adicionar chave".

## Layout

- AppHeader em todas as telas. No celular, Início · Curso · Alunos · Datas viram uma barra inferior fixa.
- Trail no topo de Criar disciplina, Cadastrar alunos e Ajustar datas.
- Use a largura. Num notebook (1366×768) cada etapa cabe na tela sem rolar a página: o painel ocupa a altura que sobra e, se for preciso, só a área de conteúdo rola por dentro. O botão principal fica sempre à vista.
- Importar arquivos, de 1100px para cima: Matriz, Tarefas e Quizzes à esquerda, a coluna da IA à direita, os dois links no rodapé. Abaixo disso, uma coluna só.
- Caderno: Sumário 280px, página até 760px de leitura, pendências 320px. Abaixo de 1100px as pendências descem; abaixo de 720px tudo vira uma coluna e as pendências viram uma folha inferior com contador.
- Margem lateral mínima de 16px. Alvos de toque de 44px ou mais.

## Movimento

- Hover, foco e troca de aba em 150ms; abrir menu, calendário ou janela em 200ms. Nada se move sozinho.
- **Troca de passo: a folha do caderno vira** (PageTurn). Ao avançar, a folha nova vira da direita para a esquerda (`mi-turn-next`, presa pela borda direita); ao voltar, da esquerda para a direita (`mi-turn-back`, presa pela borda esquerda). Dura 600ms, com `cubic-bezier(0.2, 0.7, 0.2, 1)`, dentro de um contêiner `mi-turn` que dá a perspectiva.
- Só a área do passo vira. Cabeçalho, trilha e fundo ficam parados. Ponha a classe na folha que entra, depois de trocar o conteúdo, e tire-a no `animationend`. Ao terminar, o foco vai para o título do passo.
- Com `prefers-reduced-motion: reduce`, ou "Menos movimento" no menu Mais, não há rotação: só um fade de 200ms, e nenhuma transição.

## Mascote e marca

- Uma só coruja, a **Redonda**: marrom, feita de formas redondas e cores chapadas, com olhos grandes de óculos de leitura, capelo e o "m" oficial do Moodle na barriga (`assets/Logos/brand-owl.svg`).
- De 16 a 40px use a cabeça (`brand-owl-mark.svg`): cabeçalho (34px), aba do navegador, ícones. De 72px para cima, a coruja inteira: Início, "Seu curso está pronto!", estados vazios e a fala da coruja (OwlTip).
- Sempre 2D e parada. Nunca 3D, nunca olhos que seguem o ponteiro. No máximo uma coruja grande por tela, além da do cabeçalho.
- Nome do produto: "Moodle IA", em Switzer 600.

## Iconografia

- Lucide, traço de 2px (grupo Icons). 20px em botões e campos, 16px em metadados.
- Ícone acompanha texto. Ícone sozinho só para mover, remover, fechar e Mais, com `aria-label`.
- Papéis fixos: `shield-check` muda o Moodle; `hand` você faz à mão ou no Moodle (Criar manualmente, Preencher à mão); `upload` envia arquivo; `hourglass` o Moodle IA está trabalhando; `lock` só abre sem pendências, ou a chave que fica só nesta aba.

## Acessibilidade

- Foco do teclado: anel sólido de 2px em `focus`, afastado 2px.
- Todo campo tem rótulo visível; erro junto ao campo, com `aria-invalid` e texto.
- O vidro tem saída opaca (Superfície) e a virada de folha tem saída em fade (Movimento).
- Alternâncias (Tabs) trocam com as setas; a janelinha da chave prende o foco, fecha com Esc e devolve o foco ao select.
- Toda a jornada funciona só com teclado e em 360px de largura.
