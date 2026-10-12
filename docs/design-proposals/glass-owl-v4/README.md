# Vidro, paisagem e entradas do curso — proposta 4

Protótipo visual local, com entrada, controles e acabamento revistos em 12/10/2026. Vidro, natureza e mascote continuam em avaliação visual. A importação e o processamento da aplicação continuam em planejamento.

## Revisão atual — cadastro, navegação e movimento

O cabeçalho usa uma coruja vetorial com M geométrico; o favicon usa a versão sem letra. Alunos, Fundo e Tema são cápsulas com seleção suave e altura mínima de 44 px. A mascote 3D permanece com 110 × 118 px no desktop e 88 × 100 px no celular, com o logotipo oficial na barriga.

Alunos agora demonstra Planilha → Revisão → Download. O exemplo é editável, erros e cursos repetidos bloqueiam a saída, os mesmos alunos entram em cada destino e cada CSV tem download explícito. Voltar preserva o lote; escolher outra planilha reinicia. Arquivos reais mostram metadados; o envio ao Moodle é um modal explicativo, sem operação externa. A [revisão do cadastro](../../STUDENTS_DESIGN_REVIEW.md) registra a comparação com a referência.

A conferência abre “Organização e início do curso”, com data digitável e calendário. Poucos vagalumes se aproximam após quatro segundos de ponteiro parado e acompanham por dois segundos ao mover; os prazos usam tempo real, separado da suavização da animação. Fundo oculto, aba oculta e movimento reduzido continuam respeitados.

O [quadro de telas](../../screen-flow.html) oferece miniaturas, setas, zoom, deslocamento e lista acessível. Os mesmos IDs estão no [fluxograma Mermaid](../../SCREEN_FLOW.md). A [avaliação por tarefas](../../USABILITY_REVIEW.md) registra o que funcionou e o que ainda não pode ser testado. Editor completo, interpretação por IA e geração MBZ permanecem planejados.

Evidências desta revisão: [quadro visual](screenshots/screen-flow-board.png), [cadastro desktop](screenshots/students-batch-final-desktop.png), [edição móvel](screenshots/students-mobile-edit.png) e [data visível](screenshots/course-date-visible.png). A verificação final e os limites estão no [registro da tarefa](../../tasks/DESIGN-USABILITY-01/verification.md).

## Histórico das opções do cabeçalho — 12/10/2026

Alunos, Fundo e Tema têm ícone e texto visíveis. Alunos recebe preenchimento verde; os controles de aparência usam superfícies de apoio com borda. Todos têm altura mínima de 44 px. Em até 600 px, as três opções ocupam uma linha própria abaixo da marca. O acesso a Alunos indica a área atual e o retorno limpa essa indicação. O cenário, a coruja e os fluxos de alunos e datas permanecem como na revisão anterior.

Verificação desta mudança: desktop de 1280 px e celular de 320 px sem transbordamento horizontal; as três opções mediram 44 px de altura no navegador. Exercitados acesso e retorno de Alunos, alternância de tema e mostrar/ocultar fundo. `node --check app.js` passou. A prévia isolada não registrou erros ou avisos no console. Revisão independente de especificação e qualidade não identificou achados concretos na leitura dos três arquivos. Capturas: [desktop](screenshots/header-options-desktop.jpg) e [320 px](screenshots/header-options-mobile.jpg).

## Direção visual e composição atual

Refinamento com `frontend-design`, limitado ao protótipo HTML. O plano foi revisto antes da construção e passou por uma crítica independente.

- Paleta base: névoa `#EEF6F1`, verde profundo `#173E30`, verde de ação `#26764F`, sálvia `#A5D6AE`, fundo noturno `#14241C` e texto claro `#F0F7F2`. Texto secundário `#3F5C50` no tema claro e `#C5D9CE` no escuro.
- Tipografia: Nunito variável local; título de 26 px, peso 800; rótulos dos grupos de 15 px e nomes de arquivos selecionados de 13 px com quebra de linha; controles e ajudas de 12–14 px. Em telas estreitas, título de 23 px e rótulos de 14 px; até 360 px, título de 22 px. Conteúdo alinhado à esquerda.
- Composição: painel de até 800 px. Etapas e abas integradas, título “Arquivos do curso” e três linhas verticais: Documento de planejamento, Tarefas e Quizzes. Cada linha aproxima nome, finalidade e botão. O obrigatório recebe fundo suave; os opcionais usam divisores. As três entradas ficam sempre abertas. No celular, o botão passa para baixo da descrição.
- Hierarquia: “Importar arquivos” e “Criar manualmente” são as entradas principais. “Usar exemplo”, “Copiar prompt” e “Importar JSON” ficam no rodapé como ações secundárias. “Conferir arquivos” é a ação principal. Alunos têm acesso separado; organização e datas aparecem na conferência.
- Coruja: corpo oval castanho, peito bege, olhos grandes com íris verdes, capelo preto e cordão dourado, seguindo a referência do usuário. O tamanho anterior permanece: 110 × 118 px no desktop e 88 × 100 px no celular, junto ao título, sem reservar uma faixa vazia acima do formulário. A barriga usa o M com capelo do logotipo oficial Moodle, preservando formas e cores; a [proveniência do asset](assets/ASSET_SOURCE.md) registra fonte e extração. O fallback vetorial usa o mesmo ícone.
- Vidro: branco a branco esverdeado com opacidade de 60% a 30% no tema claro; verde profundo de 52% a 36% no escuro. Desfoque de 22 px, saturação de 115%, bordas `#FFFFFFB3` / `#D6F4E047`, reflexo interno e sombra suave. Os tokens valem com campo ou fundo plano. Texto permanece sem transparência, com superfícies de apoio nos campos.
- Paisagem: campo naturalista com relevo orgânico, vegetação em tufos, variação de altura, curvatura, orientação e cor, além de vento e reação discreta ao ponteiro. Vagalumes discretos ficam nas laterais: 34 no desktop e 20 na composição compacta, com brilho maior no escuro. A [pesquisa de natureza interativa](../../NATURE_REFERENCES.md) orienta volume, luz e profundidade. Colinas lisas foram um estudo de composição; o pedido de aparência mais real requer materialidade e vegetação. O resultado procedural continua em revisão visual, sem alegação de fotorealismo. Os controles de aparência são somente tema e campo/sem fundo; sol e lua têm traços coerentes. Desligar o fundo mostra a cor plana do tema, sem pontos.
- Arquivos selecionados: ícone conforme Word/PDF/planilha/slides, extensão, nome completo com quebra de linha e tamanho. Cada grupo tem contagem local acessível; remover usa área de 44 px e mantém o foco no próximo arquivo, ou no botão de seleção se o grupo fica vazio.
- Controles: dropdown personalizado com Nunito e foco de 2 px sem halo duplo. O datepicker recebe oito números e insere as barras de `dd/mm/aaaa`; o popover fica ancorado ao campo e abre por clique mantendo o foco para digitação. Botão do calendário e teclado permitem escolher um dia dentro da conferência em modal. Datas reais entre 1900 e 2100 são validadas ao sair do campo.
- Editor do catálogo: a navegação mostra número real da sequência, título e contagem de atividades. Seleção com fundo suave e barra lateral. É uma demonstração visual, sem implementação do editor da aplicação.

### Plano e crítica do acabamento — 12/10/2026

Antes da construção, a crítica identificou que as regras específicas do campo anulavam o vidro: branco de 93% a 88% no claro e verde profundo de 85% a 65% no escuro davam aparência opaca. O detalhamento repetitivo do fundo também competia com o conteúdo. O usuário rejeitou esse acabamento. A revisão recupera translucidez, borda e reflexo, preservando a composição já simplificada, a coruja e todas as entradas visíveis. Não adiciona caixas ou informação para resolver um problema de superfície. A retirada da vegetação foi explorada em um estudo de colinas lisas; o novo pedido de natureza mais real orienta agora um campo com tufos variados, profundidade e interação, conforme as [referências pesquisadas](../../NATURE_REFERENCES.md). A seção final deste documento registra a conferência mais recente; os históricos anteriores descrevem suas respectivas composições.

```text
┌ Documentos → Revisão → Baixar curso ─────────────────┐
│ Importar arquivos | Criar manualmente                │
│ Arquivos do curso                             coruja│
│ Adicione o planejamento e os materiais.             │
│                                                    │
│ Documento de planejamento       [Escolher documento]│
│ Obrigatório · Conteúdo e organização · DOCX          │
│ Ler a partir de: Início do documento*                │
│ Tarefas · Opcional                [Adicionar tarefas]│
│ Anexos em Word, PDF, planilha ou slides              │
│ Quizzes · Opcional                [Adicionar quizzes]│
│ Documentos com as questões · DOCX                   │
│ Usar exemplo / Copiar prompt / Importar JSON        │
│                                [Conferir arquivos] │
└────────────────────────────────────────────────────┘
```

\* O início da leitura aparece junto ao documento selecionado. A escolha de trechos é demonstrada com o exemplo; arquivos locais não são interpretados. A entrada manual demonstra nome do curso e primeiro tópico.

Crítica antes da construção: três cartões idênticos repetiriam o excesso de caixas apontado pelo usuário. As linhas com divisores expressam melhor a relação entre os arquivos. “Obrigatório” e “Opcional” aparecem por escrito. Tarefas e Quizzes não dependem de expansão. A coruja foi aproximada do título para evitar altura reservada só para decoração no celular. Os botões de arquivo e remoção têm alvo de pelo menos 44 px. Na revisão independente, foi corrigida a inversão visual do rodapé no celular, para a sequência do teclado acompanhar a tela.

A entrada conserva os três grupos de arquivos da referência local `CourseGen-AI/ui/app/components/UploadStep.tsx`, com linguagem genérica: um documento de planejamento DOCX, vários quizzes DOCX e vários anexos de tarefas (DOC/DOCX, PDF, XLS/XLSX, PPT/PPTX). A demonstração não interpreta esses documentos nem associa automaticamente anexos a atividades. “Conferir arquivos” mostra separadamente os nomes selecionados e o início da leitura.

“Copiar prompt” também aparece na entrada JSON. A ação copia um modelo ilustrativo local para usar com o planejamento em outra IA; não chama API. Se o navegador bloquear a área de transferência, o diálogo apresenta o texto selecionado para cópia manual. A resposta JSON continua sendo conferida somente quanto à sintaxe, sem validar o contrato de curso.

## Escolha do início da leitura

O fixture [planejamento-exemplo.json](samples/planejamento-exemplo.json) contém cinco blocos correspondentes, na mesma ordem, aos parágrafos do [DOCX de exemplo](samples/planejamento-exemplo.docx). “Usar exemplo” carrega esses dois arquivos locais. A pessoa escolhe o primeiro bloco, visualiza quais trechos anteriores ficarão de fora e confirma em “Começar aqui”. O resumo mostra a escolha e permite voltar ao documento inteiro.

Arquivos locais exibem somente nome e tamanho. Sem parser, a escolha de trecho fica indisponível para esses arquivos, acompanhada da orientação para usar o exemplo. O protótipo não atribui blocos fictícios ao documento local. Troca ou remoção do documento limpa o recorte anterior. O exemplo é uma demonstração de interação, sem leitura por IA ou geração de curso.

## Assets e dependências

Three.js r186 é compartilhado com a proposta 2 (licença MIT). Nunito é compartilhada com a proposta 3 (OFL). Tailwind CSS e CLI 4.3.3 foram instalados somente nesta pasta de protótipo, com versões fixadas e lockfile. Nenhuma dependência foi adicionada ao manifesto da aplicação. O fundo em funcionamento é gerado por `scenery.js`; a coruja é modelada em `owl.js`.

O ícone [moodle-mark.svg](assets/moodle-mark.svg) é a extração do M com capelo do SVG oficial, sem redesenhar formas ou trocar suas cores. [Fonte, revisão e hashes](assets/ASSET_SOURCE.md) documentam a proveniência. O mesmo arquivo é usado na textura da barriga 3D e no fallback vetorial.

Referências de iluminação geradas com a ferramenta integrada de imagens: [fim da tarde](assets/meadow-day.png), [hora azul](assets/meadow-dusk.png) e [prompts completos](assets/PROMPTS.md). Não são texturas aplicadas nem uma substituição da cena 3D.

## Movimento e degradação

Hovers, foco, entrada de painéis e calendário, resposta do olhar e das asas e piscar usam 300 ms. O token `--motion-duration`, as utilities `duration-300` e o helper `motion.js` mantêm esse contrato. A direção naturalista combina paralaxe sutil, vento que atravessa regiões e reação da vegetação próxima ao ponteiro. A distribuição em tufos e a variação de altura e curvatura evitam que todo o campo responda de forma idêntica. O movimento deixa o formulário em primeiro plano e não acrescenta controles de exploração ao fluxo. A qualidade dessa resposta ainda está em revisão visual.

Não há controle separado de play/pausa. Ocultar o fundo ou ativar a preferência do sistema por movimento reduzido suspende o movimento; os vagalumes também ficam estáticos com essa preferência. A renderização pausa em aba oculta. Sem fundo, a paisagem e os vagalumes ficam ocultos e a base usa a cor plana do tema. A coruja mantém 110 × 118 px no desktop e 88 × 100 px no celular e é ocultada nas ferramentas auxiliares de JSON e alunos. Sem WebGL, a identidade permanece por uma coruja vetorial e um fundo em gradiente quando o cenário está ativo; a opção sem fundo continua plana. Qualidade gráfica em aparelhos físicos de baixa potência ainda precisa ser medida.

## CSS do protótipo

Na raiz do projeto, execute `npm --prefix docs/design-proposals/glass-owl-v4 ci` e `npm run design:css`. Nesta pasta, o comando equivalente é `npm run build:css`. O arquivo `tailwind.input.css` importa tema e utilities sem Preflight, registra as fontes do protótipo, catálogo e quadro de telas e gera `tailwind.css` minificado. O CSS compilado é incluído na entrega; o navegador não carrega Tailwind em runtime.

O cabeçalho da prévia usa utilities para flex/grid, alinhamento, espaçamento, altura mínima e cantos dos botões; o quadro usa utilities na estrutura responsiva e nos controles. Classes completas ficam no HTML e nas miniaturas geradas por JS. As declarações correspondentes foram retiradas do CSS próprio para não cancelar as utilities. Vidro, paisagem, miniaturas e conexões continuam com regras específicas.

Build verificado com Tailwind 4.3.3. No sandbox Windows desta sessão, o scanner nativo retornou zero arquivos; a compilação fora do sandbox, autorizada para esta pasta, encontrou as classes e gerou o grid responsivo.

Referências: [CLI oficial](https://tailwindcss.com/docs/installation/tailwind-cli), [detecção de classes](https://tailwindcss.com/docs/detecting-classes-in-source-files) e [duração das transições](https://tailwindcss.com/docs/transition-duration).

## Histórico de verificação — 11/10/2026

Resultados da composição anterior. Não substituem a verificação da revisão de 12/10/2026.

- Build Tailwind 4.3.3 concluído; CSS minificado de 6.337 bytes, com grid responsivo confirmado no navegador.
- Todos os scripts do protótipo e o script embutido do catálogo passaram na análise de sintaxe. O interpolador chega ao destino após 300 ms.
- Desktop 1280 × 900 e mobile 360 × 800: duas colunas de anexos no desktop e uma no mobile; sem transbordamento horizontal.
- Coruja com asas, rosto creme, olhos âmbar e bico curvo conferida nos dois temas. Brilho da grama observado na posição do ponteiro.
- Duração computada no navegador: botões, radios, checks, entrada de painel e calendário em 0,3 s.
- Pausa manual: duas capturas consecutivas idênticas; retomada e alternância entre campo e fundo pontilhado conferidas.
- Upload: erro de matriz ausente, carregamento dos três DOCX fictícios, remoção dos anexos opcionais e conferência por grupo exercitados.
- Data inválida bloqueia a conferência; calendário aceita setas, Page Down, Enter e Escape e devolve o foco ao acionador. Calendário conferido em 360 px e no catálogo.
- As seis seções de avaliação do design system permanecem presentes.
- Prévia isolada aberta em uma nova aba: nenhum erro ou aviso no console. No catálogo com iframe, o navegador registrou um erro de `MutationObserver` sem arquivo de origem; a origem não foi identificada e o fluxo de calendário continuou operante. Naquela composição, não havia uso de `MutationObserver` nos scripts próprios do catálogo ou do protótipo.

Evidências visuais em `screenshots/`: desktop claro, desktop escuro com hover, mobile nos dois temas, calendário mobile e calendário do catálogo.

## Histórico de verificação da entrada — 12/10/2026

Os registros desta seção antecedem a revisão de vidro e fundo. Não comprovam a qualidade visual ou o contraste da nova composição.

Comportamentos observados no navegador nesta rodada:

- Sem documento, “Conferir arquivos” mostra o erro de arquivo obrigatório.
- “Usar exemplo” carrega o planejamento fictício.
- A escolha de início aceita navegação por setas; o resumo mostra o trecho selecionado e “Ler documento inteiro” restaura a seleção completa.
- O calendário funciona dentro da conferência.
- O caminho criação manual → alunos → voltar mantém o contexto e os campos preenchidos.

Esta rodada altera somente os artefatos de design e suas interações locais. Não inicia a implementação da aplicação, não envia documentos nem chama IA, e não cadastra pessoas ou gera um curso.

Limites: o cenário continua sendo um modelo procedural estilizado. Desempenho em aparelhos físicos, contraste sobre todos os fundos compostos e a degradação por perda de WebGL ainda exigem validação específica. A preferência por movimento reduzido está implementada, mas não foi emulada nesta conferência. Este protótipo não processa documentos, cadastra pessoas ou exporta um curso Moodle.

### Conferência final da revisão e da mascote — 12/10/2026

- Tela inicial verificada no desktop, em 390 × 844 e em 320 × 780; sem transbordamento horizontal. Temas claro e escuro conferidos. Coruja com íris verdes, olhos grandes e capelo preto vista no desktop e em 390 px; fallback SVG atualizado para a mesma direção.
- Documento local fictício selecionado pelo seletor: exibiu nome/tamanho e a orientação para experimentar recortes com “Usar exemplo”; nenhuma prévia de conteúdo foi atribuída ao arquivo local.
- Diálogo de leitura conferido em 390 px; setas selecionam o início, o resumo informa o recorte e o retorno ao documento inteiro funciona. Escape fecha a conferência. Remover o documento oculta e limpa o controle de leitura.
- Conferência com calendário interno e retorno manual → alunos → curso exercitados. O catálogo mantém seis seções de avaliação e a prévia embutida atualizada.
- Sintaxe de app.js, uploads.js e owl.js válida. IDs únicos nos dois HTMLs. Console da prévia isolada sem erros ou avisos nesta rodada. Documentação: 11 arquivos e 7 diagramas Mermaid conferidos, sem links locais ausentes.
- Evidências: [desktop escuro](screenshots/ux-import-desktop.jpg), [desktop claro](screenshots/ux-import-desktop-light.jpg), [mobile claro](screenshots/ux-import-mobile-light.jpg) e [seleção de trecho](screenshots/ux-reading-start.jpg).

A conferência é do protótipo visual; não comprova processamento de documentos, integração com IA ou exportação Moodle.

### Retorno sobre Tarefas e Quizzes — 12/10/2026

As duas áreas agora ficam abertas permanentemente. No navegador, o desktop de aproximadamente 1265 × 713 mostrou as três entradas e o botão de conferência na primeira tela. Em 390 px, Tarefas e Quizzes aparecem empilhados, sem transbordamento horizontal. Os inputs, formatos, listas e handlers existentes foram preservados. Evidências: [desktop](screenshots/visible-tasks-quizzes-desktop.jpg) e [celular](screenshots/visible-tasks-quizzes-mobile.jpg).

### Simplificação em três linhas — 12/10/2026

- Conferência visual em desktop de aproximadamente 1265 × 800 e em 390 × 844 e 320 × 780. Documento, Tarefas e Quizzes permanecem na página sem expansão. As medidas de largura do DOM não indicaram transbordamento horizontal nas larguras verificadas.
- Temas claro e escuro conferidos. O fundo claro foi tornado mais opaco após inspeção do texto sobre o cenário.
- Exercitados: erro de documento ausente, carregamento do exemplo, escolha do início por seta do teclado, conferência, Escape, remoção do documento e alternância de abas por setas. O foco das abas tem contorno visível.
- A revisão independente de HTML, CSS, JavaScript e capturas pediu alinhar a ordem visual e de foco no rodapé mobile; ajuste aplicado. Não identificou outra regressão concreta nessa inspeção.
- Na aba de teste ativa, os seletores de Tarefas e Quizzes aceitaram os DOCX fictícios locais; seus nomes apareceram nos grupos corretos e na conferência, junto ao planejamento de exemplo. A remoção dos três arquivos foi exercitada. A primeira tentativa na aba inativa expirou no seletor automatizado; a limitação foi resolvida ao usar a aba ativa. Nenhum arquivo foi enviado a um servidor.
- Scripts com sintaxe válida, IDs únicos nos dois HTMLs e catálogo com seis seções preservadas. O verificador de documentação conferiu 11 arquivos e 7 diagramas Mermaid, sem links locais ausentes. Console da prévia isolada sem erros ou avisos nas verificações desta rodada.
- Evidências da simplificação, anteriores à revisão de vidro e fundo: [desktop escuro](screenshots/simple-rows-desktop.jpg), [celular escuro](screenshots/simple-rows-mobile.jpg), [desktop claro](screenshots/simple-rows-desktop-light.jpg) e [320 px claro](screenshots/simple-rows-320-light.jpg).

Continua sendo uma prévia local. Não há processamento de documentos, chamada à IA, cadastro real ou geração de pacote Moodle. A implementação da aplicação continua aguardando autorização.

### Vidro recuperado e pesquisa de natureza — 12/10/2026

- Fontes e análise em [referências de natureza](../../NATURE_REFERENCES.md). Grassworks e Below the Grassland foram abertos e inspecionados no navegador; Selva e False Earth foram consultados nas páginas dos criadores. A pesquisa orienta este estudo, sem reprodução de código ou assets desses projetos.
- A superfície voltou a mostrar as mudanças de cor e forma atrás dela. Tokens conferidos no navegador: `blur(22px) saturate(1.15)`, preenchimento claro de 60% a 30% e escuro de 52% a 36%.
- A primeira tentativa de colinas lisas foi revista por parecer abstrata demais. O estudo atual usa relevo assimétrico, vegetação curva em grupos irregulares, luz lateral, nuvens finas e vento regional. A maior parte da vegetação fica perto da câmera; o centro permanece protegido pelo vidro. O cenário continua em avaliação estética, sem alegação de fotorealismo.
- Desktop 1280 × 840 e celular 390 × 844 inspecionados. Os três grupos de arquivo permanecem visíveis; largura de rolagem igual à largura de 390 px. Temas claro e escuro conferidos.
- Pausa manual verificada com duas capturas consecutivas idênticas. Alternância para fundo pontilhado, erro de documento ausente e setas entre abas exercitados; foco visível observado. Movimento reduzido e perda de WebGL têm tratamento no código, mas não foram simulados nesta rodada.
- Sintaxe de `scenery.js` válida e console da prévia sem erros/avisos nas inspeções. Documentação: 12 arquivos e 7 diagramas Mermaid, sem links locais ausentes.
- Capturas: [tema claro](screenshots/nature-glass-light.jpg), [tema escuro](screenshots/nature-glass-dark.jpg) e [celular](screenshots/nature-glass-mobile.jpg).

Alterações restritas ao protótipo e à documentação. Desempenho em aparelhos físicos e contraste sobre todas as composições continuam sem validação completa.

### Conferência dos controles, arquivos e identidade — 12/10/2026

Esta é a rodada mais recente. Os registros anteriores de pausa manual, fundo pontilhado e nomes truncados pertencem às composições históricas; esses comportamentos foram substituídos pelas opções descritas no início do documento.

- Sintaxe válida nos sete arquivos JavaScript do protótipo e no script embutido do catálogo, verificada com `node --check`. IDs únicos: 69 no catálogo e 85 no protótipo.
- Desktop de 1280 px e celular de 390 px sem transbordamento horizontal. Temas claro e escuro conferidos. A coruja mantém as dimensões anteriores e usa o ícone oficial com capelo; o cenário inclui os vagalumes laterais.
- Desligar o fundo produziu `data-scene="none"`, `data-motion="paused"`, paisagem com `display: none` e `background-image: none`. Não há controle de play/pausa nem fundo pontilhado na composição atual.
- No datepicker dentro da conferência, digitar `19102026` produziu `19/10/2026` mantendo o foco no campo. Escolher 20 de outubro produziu `20/10/2026`, fechou o calendário e devolveu o foco ao input. No catálogo, 31 de fevereiro recebeu erro somente ao sair do campo; 29 de fevereiro de 2024 foi aceito como válido.
- Dropdown do catálogo mostrou as três opções e permitiu seleção por teclado. Menu e foco personalizados foram conferidos.
- Arquivo fictício com nome longo apareceu completo no desktop de 1280 px sem transbordamento. Remover manteve o foco no próximo arquivo e, ao esvaziar o grupo, no botão de seleção. Em 390 px, o documento fictício exibiu o nome completo com quebra de linha.
- “Copiar prompt” exibiu mensagem de sucesso na interface. A API virtual de clipboard usada pela inspeção não comprova o conteúdo da área de transferência real do usuário. O caminho de fallback com texto selecionado para cópia manual foi revisto estaticamente.
- A prévia isolada em aba nova não apresentou erros ou avisos no console. O catálogo mantém um registro histórico de erro de `MutationObserver` sem origem identificada; não se declara console limpo do catálogo nesta rodada.
- Capturas: [desktop escuro](screenshots/controls-final-dark.jpg), [celular](screenshots/controls-final-mobile.jpg), [lista de arquivos](screenshots/controls-file-list.jpg), [arquivo no celular](screenshots/controls-file-mobile.jpg), [editor e unidades](screenshots/controls-editor-desktop.jpg), [dropdown](screenshots/controls-dropdown-desktop.jpg) e [datepicker](screenshots/controls-datepicker-desktop.jpg).

Os resultados são da demonstração local. Não comprovam leitura de documentos, chamadas de IA, cadastro ou exportação Moodle. O tratamento de movimento reduzido permanece no código; sua emulação e medições em aparelhos físicos não foram acrescentadas a esta rodada. A implementação da aplicação continua em planejamento.
