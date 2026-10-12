# Design do editor de cursos Moodle

**Status:** direção de vidro e verde em avaliação visual. Entrada simplificada em 12/10/2026; acabamento do vidro e da paisagem revisto após o retorno do usuário. **Nome:** Moodle-AI, provisório.

Referência principal: [design system interativo](../design-system.html). A proposta de entrada está em [vidro, paisagem e coruja 3D](design-proposals/glass-owl-v4/index.html), com [direção e limites](design-proposals/glass-owl-v4/README.md). Esses artefatos são protótipos de design; não iniciam a implementação da aplicação. A paisagem teve como referência inicial o campo, céu amplo e árvore isolada mostrados no [vídeo de Jeroen van Welsenes](https://x.com/Guronnimo/status/2108818974347526387), indicado pelo usuário. O pedido de natureza interativa mais real orienta agora um campo naturalista, com vegetação em tufos, luz e profundidade; a [pesquisa de referências](NATURE_REFERENCES.md) registra as fontes e os limites. O acabamento continua em revisão visual.

O produto é uma ferramenta de trabalho para quem prepara uma disciplina. Seu elemento principal será o curso em construção: seções, atividades e pendências visíveis. A identidade será própria do produto; o nome de uma instituição poderá aparecer nos dados de um curso sem definir o visual da aplicação.

## Revisão de usabilidade da entrada — 12/10/2026

A [comparação com o fluxo de referência](UX_REVIEW_IMPORT.md) identificou excesso de informação na composição anterior da v4. A primeira revisão retirou a abertura promocional e os cartões laterais e recuperou as etapas Documentos → Revisão → Baixar curso. O refinamento com `frontend-design` apresenta o título “Arquivos do curso”, com etapas e abas integradas ao painel único de até 800 px. Documento de planejamento, Tarefas e Quizzes formam três linhas verticais no desktop e no celular. O documento obrigatório tem destaque suave; os opcionais permanecem visíveis, separados por divisores.

“Importar arquivos” e “Criar manualmente” são as duas entradas principais. A criação manual usa campos de nome do curso e primeiro tópico; “Usar exemplo”, “Copiar prompt” e “Importar JSON” ficam como ações secundárias no rodapé, e alunos ficam em uma ferramenta separada. Organização e datas aparecem na conferência. A identidade de vidro, verde, cenário e coruja permanece como direção escolhida. A coruja acompanha o título, sem reservar uma faixa vazia antes do formulário em tela estreita.

“Ler a partir de” aparece após selecionar o documento, com início no documento inteiro. A escolha de trecho funciona no documento de exemplo: cinco blocos correspondem ao conteúdo do DOCX incluído no protótipo. A prévia mostra o que ficará de fora, resume a seleção e permite voltar ao documento inteiro. Para arquivos locais, são exibidos apenas nome e tamanho, com orientação para experimentar a seleção usando o exemplo; não há parser desses documentos nesta etapa.

Verificação registrada na revisão anterior no navegador: erro de documento ausente, carregamento do exemplo, seleção do início por setas, resumo do trecho, retorno ao documento inteiro, calendário na conferência e navegação criação manual → alunos → voltar mantendo os campos preenchidos. Esse registro não comprova a verificação do refinamento em três linhas. A revisão visual altera somente os artefatos de design; a implementação da aplicação continua em planejamento.

### Retorno sobre vidro e fundo — 12/10/2026

O usuário rejeitou a perda do efeito de vidro e o acabamento do fundo. A crítica identificou dois problemas: a alta opacidade deixava o painel com aparência sólida, enquanto o detalhamento repetitivo do cenário competia com o formulário. O plano preserva as três linhas de arquivos, a hierarquia, a coruja e as interações; a mudança está no acabamento. A superfície volta a mostrar a paisagem desfocada, com borda e reflexo definidos. Colinas lisas foram exploradas como estudo de composição. O pedido seguinte de natureza mais real levou a um campo com relevo orgânico, tufos variados e vento, conforme a [pesquisa de referências](NATURE_REFERENCES.md). A direção naturalista está autorizada; o resultado procedural ainda está em revisão e não é descrito como fotorealista. Os registros de testes anteriores não validam essa nova composição; a conferência visual desta rodada será registrada separadamente.

### Controles, arquivos e identidade — 12/10/2026

O refinamento seguinte preserva as três entradas visíveis e reduz o peso visual dos controles. O dropdown usa Nunito, menu personalizado e contorno de foco de 2 px, sem halo duplo. A pessoa pode escolher por clique ou teclado. O calendário abre ao clicar no campo mantendo o foco para digitação; o botão do calendário e o teclado permitem passar à escolha de um dia, inclusive na conferência em modal. Oito números recebem automaticamente as barras: `19102026` aparece como `19/10/2026`. Ao sair do campo, datas inexistentes ou fora de 1900–2100 recebem erro explícito, sem serem corrigidas silenciosamente.

Os arquivos selecionados aparecem em linhas com ícone do formato, nome completo que pode quebrar em mais de uma linha, extensão e tamanho. Cada grupo informa sua contagem local. A remoção tem área de 44 px e mantém o foco no próximo arquivo disponível, ou no botão de seleção quando o grupo fica vazio. Não há corte do nome por reticências nem indicação de envio ou processamento.

“Copiar prompt” volta às ações secundárias da entrada e também aparece em “Importar JSON”. A ação copia um texto ilustrativo local para usar com o planejamento em outra IA. Se o navegador bloquear a cópia automática, um diálogo apresenta o texto selecionado para cópia manual. Esse caminho não chama API de IA nem comprova a validade do contrato de curso.

Sol e lua usam desenhos de traço coerente. O topo tem somente dois controles de aparência: tema e mostrar/ocultar fundo. O campo continua como cenário inicial; ao ocultá-lo, a área de trabalho recebe a cor plana do tema. Play e pausa deixam de ser controles da interface. O estado de movimento acompanha o fundo e a preferência do sistema por movimento reduzido. Na barriga da coruja, o ícone Moodle com capelo mantém as formas e cores originais; a [proveniência do arquivo local](design-proposals/glass-owl-v4/assets/ASSET_SOURCE.md) registra a fonte oficial e a extração. O tamanho da mascote permanece em 110 × 118 px no desktop e 88 × 100 px no celular, conforme o CSS, sem ampliar o espaço ocupado no formulário. A conferência visual desses refinamentos deve ser registrada separadamente; os testes históricos acima não são evidência desta rodada.

### Natureza e navegação das unidades — 12/10/2026

Vagalumes discretos ocupam as laterais do cenário, preservando o centro para o formulário. O estudo usa 34 no desktop e 20 em composição compacta, com brilho maior no tema escuro. Seu movimento respeita a preferência por movimento reduzido; ocultar o fundo também oculta os vagalumes e interrompe a animação do cenário.

No exemplo de editor do catálogo, a navegação das unidades passa a mostrar o número correspondente à sequência real, o título e a contagem de atividades. O número informa posição no curso; não é um marcador decorativo. A seleção usa um fundo suave e uma barra lateral, mantendo o título legível. Esse acabamento pertence à demonstração visual, sem iniciar a implementação do editor nem acrescentar um novo registro de verificação no navegador.

### Cabeçalho aplicado — 12/10/2026

As ações **Alunos**, **Fundo** e **Tema** permanecem com ícone e texto visíveis em todas as larguras. Os três controles usam cápsulas arredondadas; seleção usa preenchimento suave e borda, sem barra interna. Os alvos têm pelo menos 44 px. No desktop, o conjunto fica ao lado do logotipo; no celular, ocupa uma linha própria com três colunas. O estado `aria-current` de Alunos acompanha a área aberta e é removido ao voltar à preparação do curso.

### Propostas ainda em discussão

As propostas abaixo decorrem da leitura do protótipo, do PRD e do retorno do usuário. Natureza e Datas continuam em discussão; o cadastro em lote ganhou uma demonstração local, descrita na revisão posterior.

- **Natureza:** explorar vegetação mais distante e desfocada, com menor presença visual durante a edição. O cenário pode continuar como identidade opcional, enquanto um fundo plano favorece a leitura de formulários densos. A composição atual permanece disponível para avaliação.
- **Alunos:** a ficha individual deu lugar à demonstração do cadastro em lote, conforme a revisão abaixo. A implementação real de F01 do [backlog](BACKLOG.md) continua futura e fora do MVP.
- **Datas:** tornar o cronograma fácil de encontrar no editor planejado, separando início do curso dos prazos pertinentes às atividades, com erros junto aos campos e resumo das alterações. Essa direção acompanha R04 e R07 do [PRD](PRD.md). Alterar datas de turmas publicadas permanece uma entrega futura F02 do backlog. O campo atual de início do curso na conferência continua sendo uma demonstração local.

## Trabalho principal da interface

Tailwind CSS passa a ser a base dos agrupamentos, espaçamentos e controles dos protótipos e orienta a futura implementação de UI. O build local compartilhado tem fontes explícitas e não inclui Preflight, preservando os estilos existentes. Vidro, paisagem procedural e conexões do quadro continuam com CSS específico. O comando `npm run design:css`, na raiz, recompila os artefatos de design; não inicia a aplicação.

A pessoa precisa entender o que foi importado, corrigir o planejamento e verificar o que entrará no Moodle. A tela deve aproximar documento e curso, e tornar a edição mais simples que manipular JSON. A proposta visual parte da orientação de [frontend-design](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md), aplicada ao contexto de planejamento pedagógico.

## Direção visual proposta

O vidro translúcido mantém a direção solicitada. A paisagem busca um campo naturalista com interação discreta, orientado pelas referências pesquisadas. A qualidade do resultado continua em avaliação com o formulário e a coruja.

Uma área de trabalho com painel de vidro translúcido, cantos arredondados e verde nas ações. O cenário principal propõe um campo aberto com relevo orgânico, vegetação agrupada em tufos e distância suavizada pela atmosfera. Altura, curvatura, orientação e cor variam entre as lâminas de grama. A vegetação mais próxima recebe detalhe, enquanto o centro permanece calmo para leitura; o topo permite mostrar ou ocultar a paisagem. Sem a paisagem, o fundo é a cor plana do tema. O tema escuro inicial usa azul-petróleo e verde profundo; o tema claro usa luz diurna, verde e tons suaves de azul esverdeado. Uma coruja em castanho e creme, com corpo oval, pequenas orelhas, asas laterais e capelo preto com cordão dourado, fica junto ao título do painel. O ícone Moodle com capelo identifica a barriga. Rosto curvo, bico arredondado e levemente curvo, olhar receptivo, íris verdes e piscar suave aproximam a mascote da interface. Os olhos acompanham discretamente o ponteiro. O modelo procedural é uma escultura simplificada; o acabamento natural de um futuro modelo 3D ainda precisa ser avaliado.

A entrada usa um painel único com largura máxima de 800 px, sem slogans nem cartões laterais. Etapas e abas ficam dentro desse painel. As abas escolhem entre importar arquivos e criar manualmente. As três linhas de arquivos aproximam ícone, nome, finalidade e botão: documento obrigatório com fundo suave, seguido de Tarefas e Quizzes opcionais com divisores. No celular, os botões passam para baixo das descrições, mantendo os três grupos visíveis sem expansão. “Usar exemplo”, “Copiar prompt” e JSON têm acesso secundário no rodapé, e alunos têm acesso próprio no topo. Na edição futura, a estrutura do curso permanece visível e os campos recebem superfícies mais opacas.

| Token | Valor proposto | Uso |
| --- | --- | --- |
| Fundo | `#EEF6F1` / `#14241C` | Bases clara e escura; cor plana quando o cenário está oculto. |
| Superfície | `#FFFFFF` / `#20362A` | Campos e leitura densa; cartões usam vidro. |
| Texto | `#173E30` / `#F0F7F2` | Conteúdo e rótulos nos temas claro e escuro. |
| Texto secundário | `#3F5C50` / `#C5D9CE` | Ajuda e metadados nos temas claro e escuro. |
| Ação | `#26764F` | Ação principal e seleção da seção atual. |
| Erro | `#A32638` | Pendência bloqueante, sempre acompanhada de texto. |

Cor não será o único sinal de tipo ou status. Fórum, tarefa e quiz terão nome e ícone reconhecíveis. Cores adicionais de aviso e sucesso serão definidas e medidas no protótipo.

**Vidro e forma:** gradiente de branco a branco esverdeado com opacidade de 60% a 30% no tema claro; verde profundo de 52% a 36% no escuro. O mesmo token vale com paisagem ou fundo plano. Desfoque de 22 px com saturação de 115%, borda `#FFFFFFB3` no claro e `#D6F4E047` no escuro, reflexo interno e sombra suave tornam a superfície perceptível. Menta `#B6D8BE` acompanha a identidade; a coruja usa creme, castanho e verde nos olhos. Painel principal com raio de 26 px no desktop, botões de arquivo com raio de 10 px e ação principal em cápsula. Texto permanece sem transparência; campos, editor e informações densas recebem superfícies de apoio. Sem suporte a desfoque, usar superfície opaca.

**Paisagem em revisão:** céu e horizonte suaves, verdes com variação de luz e sombra, vegetação em camadas e atmosfera que reduz o detalhe à distância. A [pesquisa de natureza interativa](NATURE_REFERENCES.md) orienta distribuição orgânica, tufos com volume e coerência entre vento e posição. Vagalumes discretos ficam nas laterais: 34 no desktop e 20 em composição compacta, mais luminosos no escuro, estáticos com movimento reduzido e ocultos com o fundo desligado. A mudança de cor do relevo deve continuar perceptível atrás do painel, para que o vidro seja reconhecível. O estudo anterior de colinas lisas usava céu `#C6DFDF`, luz `#E8EEE1`, verde `#88B8A5` / `#507E6A` e noite `#122E3B` / `#628D91` / `#335F54`; esses valores são referência de composição, não uma restrição para os materiais do campo naturalista.

**Tipografia proposta:** Nunito variável em títulos, formulários e navegação, hospedada localmente com licença OFL e substitutas do sistema. Na entrada revisada, “Arquivos do curso” usa 26 px e peso 800 no desktop e 23 px no celular, com ajuste para 22 px em larguras de até 360 px; rótulos dos grupos usam 15 px no desktop e 14 px no celular, enquanto nomes de arquivos selecionados usam 13 px com quebra de linha. As ajudas são curtas e os botões dizem “Escolher documento”, “Adicionar tarefas” e “Adicionar quizzes”. O corpo varia de 15–17 px conforme a densidade. Os valores finais dependem de leitura, contraste e uso no navegador. Ícones próprios de traço arredondado acompanham rótulos e controles.

**Interações:** expandir uma atividade revela seus campos; selecionar uma pendência abre o campo; salvar informa o estado real do rascunho. O processamento mostra etapas verificáveis como leitura, interpretação e validação. A cabeça da coruja e os olhos acompanham o ponteiro com amplitude pequena; não há giro contínuo. No cenário, o vento atravessa regiões do campo e o ponteiro altera discretamente a perspectiva e a vegetação próxima. Não é necessário caminhar, dirigir a câmera ou configurar efeitos para usar o formulário. As imagens geradas servem apenas de referência artística de iluminação e textura. A preferência por movimento reduzido deixa a cena estática; em aba oculta, a animação pausa. Ocultar o fundo pausa o movimento e interrompe a animação do cenário, sem controle separado de play/pausa. Sem WebGL, uma coruja vetorial estática e um fundo em gradiente mantêm a identidade quando o cenário está ativo; a opção sem fundo continua plana. Controles continuam utilizáveis em telas estreitas.

**Duração e Tailwind:** hovers, foco, entrada de painéis e calendário, resposta do olhar e das asas e piscar usam 300 ms. Paralaxe e vegetação acompanham suavemente o ponteiro; o vento ambiental tem ritmo próprio e variação espacial. `motion.js` concentra as respostas WebGL; o token `--motion-duration` e `duration-300` padronizam a interface. Movimento reduzido elimina transições e pausa o 3D. Tailwind 4.3.3 é compilado apenas para o protótipo, com fontes explícitas, classes completas, utilitários responsivos e CSS minificado; sem compilação no navegador.

**Controles personalizados:** radios e checks nativos estilizados, dropdown com menu próprio e foco de 2 px sem halo duplo, e inputs arredondados com erro explícito. O calendário em popover permite digitação com máscara automática `dd/mm/aaaa`, clique sem retirar o foco do campo e entrada na grade pelo botão ou `Alt` + seta para baixo. A grade permite setas, troca de mês, seleção, limpeza e Escape; datas inexistentes ou fora de 1900–2100 recebem erro ao sair do campo. A personalização mantém semântica e uso por teclado, inclusive dentro do modal de conferência.

**Entradas da proposta:** importar documento ou criar o curso manualmente por formulário. A importação diferencia documento de planejamento DOCX obrigatório, documentos de quizzes DOCX opcionais e anexos de tarefas opcionais (DOC/DOCX, PDF, XLS/XLSX, PPT/PPTX na demonstração). Cada grupo permite selecionar, remover e conferir seus arquivos com nome completo, ícone de formato, extensão, tamanho e contagem local. “Conferir arquivos” abre uma conferência local; não interpreta documentos nem associa automaticamente anexos a atividades. Organização por tópicos ou semanas e início do curso ficam nessa conferência. “Copiar prompt” oferece um texto ilustrativo para usar externamente, com cópia manual se o navegador bloquear o acesso à área de transferência. JSON tem entrada secundária e apenas sua sintaxe é verificada, sem comprovar validade do contrato de curso. Alunos ficam em uma ferramenta separada, com acesso arredondado e identificado por ícone e texto no cabeçalho; o cadastro é uma demonstração visual solicitada pelo usuário e não amplia automaticamente o MVP nem autoriza operações sobre pessoas reais. Arquivos e dados permanecem no navegador.

## Duas organizações para comparar

### A editor centrado no curso

Uma lista de seções acompanha o formulário; o painel de pendências mostra o que impede a exportação. É a primeira proposta porque atende importação e criação manual no mesmo espaço.

```text
+------------------------------------------------------------+
| Introdução à programação       Rascunho salvo   Conferir     |
+---------------+-----------------------------+--------------+
| Curso         | Unidade 2: condições        | Pendências   |
| Apresentação  | Título e objetivos          | 1 erro       |
| Unidade 1     |                             | Quiz sem     |
| Unidade 2 *   | Atividades                  | questões     |
| Unidade 3     | [Fórum: discussão]          |              |
|               | [Tarefa: exercício + anexo]  | Avaliação    |
| Adicionar     | [Quiz: verificar questões]  | Categorias   |
| unidade       | Adicionar atividade         | e pesos      |
+---------------+-----------------------------+--------------+
```

O conteúdo do formulário corresponde à seção selecionada. A navegação identifica cada unidade por número da sequência, título e contagem de atividades; fundo suave e barra lateral indicam a seleção. O resumo de avaliação pode ser recolhido para dar espaço ao trabalho. Em tela pequena, lista e pendências abrem em painéis acessíveis, mantendo uma única coluna de edição. O catálogo demonstra a navegação, mas a implementação da aplicação permanece em planejamento.

### B conferência centrada na origem

Durante a revisão da importação, mostrar o trecho extraído do documento ao lado do curso ajuda a conferir datas e descrições. Essa visão complementa o editor; não exige documento para trabalhar manualmente.

```text
+------------------------------------------------------------+
| Conferir interpretação        Voltar ao editor              |
+-----------------------------+------------------------------+
| Planejamento original       | Curso interpretado           |
| Unidade 2                   | Unidade 2                    |
| Objetivos e atividades      | Título, objetivos            |
| Trecho selecionado          | Atividades e datas editáveis |
|                             |                              |
| Origem do conteúdo          | Ausências e ambiguidades     |
+-----------------------------+------------------------------+
```

A origem mostrada precisa ser recuperada do documento. Uma explicação produzida pela IA não será apresentada como citação comprovada. No MVP, a aplicação pode começar com trechos de texto identificados; referências precisas a páginas exigem capacidade adicional do leitor DOCX.

## Telas e estados necessários

| Tela | Conteúdo e ação |
| --- | --- |
| Início | Preparar curso, criar manualmente e explorar exemplo. Rascunhos só aparecem quando existirem. |
| Documentos | Tipo e formato aceitos, arquivos reais, destino dos complementos e interpretar planejamento. |
| Editor | Metadados, seções, atividades e notas; quando disponível, trecho recuperado do documento ou identificação da predefinição aplicada. |
| Conferência | Resumo, cronograma, arquivos por atividade, erros bloqueantes e avisos. |
| Entrega | Baixar pacote, compatibilidade testada, como restaurar e continuar editando. |

Cada tela deverá ter estados de vazio, processamento, falha recuperável e sucesso verificável. Busca, avatar, progresso numérico e controles sem comportamento não fazem parte do protótipo principal.

## Critérios da prototipação

Usar o mesmo curso fictício nas duas organizações para compará-las. Verificar se uma pessoa encontra um quiz incompleto, corrige uma data, muda um anexo de destino e entende por que a exportação está bloqueada.

O protótipo deve ser inspecionado em desktop e em 360 px, com teclado, foco visível e zoom. Contraste e estados de erro serão medidos durante a implementação; a tabela de tokens, sozinha, não comprova acessibilidade.

A aplicação genérica deverá ser reconhecível pelo trabalho que facilita, mantendo uma identidade própria. A generalidade dos dados não exige uma interface sem personalidade.


## Cadastro em lote, marca e interação — 12/10/2026

Após comparar a jornada original, o protótipo recupera Planilha → Revisão → Download. A lista fictícia é editável, os cursos de destino são definidos para o lote inteiro e a saída apresenta um CSV de demonstração por curso. Arquivos locais mostram somente metadados; a revisão usa o exemplo explícito. O envio ao Moodle tem sua sequência descrita, sem conexão ou cadastro. Contrato, comparação e limites estão na [revisão do cadastro em lote](STUDENTS_DESIGN_REVIEW.md). Isso não incorpora F01 ao MVP nem inicia a aplicação.

A marca passa a usar uma coruja vetorial minimalista com M geométrico na barriga; o favicon usa somente a coruja. A mascote 3D conserva seu tamanho e o ícone oficial. Os botões Alunos, Fundo e Tema usam cápsulas com seleção suave. Após quatro segundos de ponteiro parado, poucos vagalumes se aproximam; acompanham por dois segundos ao retomar o movimento e voltam às laterais, respeitando movimento reduzido e fundo oculto.
