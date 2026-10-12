# UX02 — Cenário 3D, mascote e consistência da interface

Pedido do usuário em 12/10/2026: o fundo não transmite o 3D esperado, a coruja causa estranheza, tarefas são difíceis de encontrar, controles divergem do design system e há baixo contraste. Solicita também a organização do código para acompanhar.

Base: `9c2167d13507129a77f141f040dde24a6f35a111`. Autoridade visual: `docs/DESIGN_BRIEF.md` e o catálogo `design-system.html`, com o retorno atual prevalecendo sobre opacidades históricas. A direção permanece Nunito, verde, vidro, natureza e mascote acadêmica. A fotografia com Canvas2D da FULL-01 não satisfaz a expectativa atual de profundidade; esta fatia substitui a implementação visual, sem alterar CourseDraft ou integração Moodle.

## Direção e limites

- Cenário com geometria Three.js, perspectiva, terreno em planos de profundidade, vegetação em grupos, luz e atmosfera. Centro visual calmo; bordas comunicam volume e resposta ao ponteiro. Dependências e assets locais já disponíveis.
- Coruja estilizada em castanho e creme, materiais suaves, olhos integrados ao rosto, olhar discreto e bico arredondado. Preservar capelo, marca oficial da barriga e footprint responsivo.
- Painel de vidro reconhecível; áreas de leitura e controles recebem apoio suficiente para contraste previsível. Tokens compartilhados para rótulos, ajuda, botões, campos, foco e seleção.
- Planejamento, Tarefas e Quizzes sempre visíveis na entrada. Manter recursos opcionais e seus formatos reais. Ações principais próximas do conteúdo; reduzir espaçamento antes de esconder funcionalidades.
- Os contratos e a persistência existentes são preservados. Não acessar Moodle IFCE; a fatia visual não requer novas operações no laboratório nem chamadas pagas de IA.

## Aceites

| ID | Evidência esperada |
| --- | --- |
| A1 | Cena WebGL real visível em navegador, geometria com profundidade e resposta ao ponteiro; tema e Fundo funcionam. |
| A2 | Coruja com rosto/olhos/bico suaves, capelo e marca preservados, sem aumento do footprint; fallback coerente. Avaliação estética documentada por captura. |
| A3 | Tarefas e Quizzes visíveis ao abrir a tela, sem expansão. Desktop 1280×720 mostra os três grupos e ação principal; mobile 360×800 sem overflow horizontal. |
| A4 | Rótulos, ajudas e ações essenciais com contraste de texto normal de pelo menos 4,5:1 sobre as superfícies compostas escolhidas, nos dois temas. Foco de teclado visível e controles consistentes. |
| A5 | Erro sem documento, criação manual, abertura/edição de tarefa, retorno, modal e teclado preservados no navegador. Typecheck, lint, testes relevantes e build aprovados. |
| A6 | Runtime testa pausa por aba oculta, movimento reduzido, desligamento/dispose e fallback WebGL. Emulação real de preferência do sistema apenas se API documentada disponível; registrar limite caso indisponível. |
| A7 | Mapa factual dos diretórios, fluxo de dados e pontos de acoplamento disponível ao usuário; distinguir código atual de refatorações recomendadas. |
| A8 | Pedido adicional do usuário: separar páginas concentradas em componentes, hooks e helpers. Rotas de curso, alunos e datas ficam como composição; estado/ações e apresentação têm módulos por funcionalidade. Editores maiores são divididos por responsabilidade, preservando contratos, invalidação por revisão, persistência e confirmação única. Não basta mover o monólito inteiro para outro arquivo. |

## Execução e revisão

Três implementadores em worktrees exclusivos: cenário, coruja e interface. Integrador cuida de contexto, documentação, verificação no navegador, revisão do diff, registros e merges. Duas avaliações independentes (spec e qualidade) na mesma revisão imutável antes de integrar em main. Máximo de dois ciclos de correção da revisão formal; iteração visual pré-candidata faz parte da implementação. Git local por funcionalidade autorizado pelo usuário; publicação/push não fazem parte desta fatia.

O catálogo histórico demonstra controles mais elaborados do que alguns controles atuais. Nesta fatia, equivalência visual/semântica e teclado são prioritários; não reescrever calendários, contratos ou fluxos que não são necessários para corrigir a reclamação.

## Ampliação autorizada durante a execução

O usuário pediu explicitamente a refatoração real, além do mapa. Branches próprias: `refactor/course-feature`, `refactor/students-feature` e `refactor/dates-feature`. A branch de curso parte do commit de correção visual; alunos e datas partem da base e não alteram CSS/contratos compartilhados. As páginas passam a compor features em `src/client/features/{course,students,dates}`. Helpers de apresentação não duplicam regras de domínio. Verificação inclui criação/edição de curso e tarefa, simulação de datas, cadastro fictício/preparação de CSV, estados inválidos e navegação/teclado.

Depois, o usuário solicitou informar qualquer URL Moodle no formulário. Essa ampliação está delimitada em `URL01-moodle-connection.md` e na branch `feat/moodle-url-connection`; substitui apenas a restrição inicial de não alterar a integração Moodle. Os testes de rede continuam exclusivamente no laboratório local. Disponibilidade do adaptador usa `available`; `validated` preserva o significado de compatibilidade verificada, sem fazer essa alegação para URLs públicas simuladas.

Pedido seguinte: ampliar o card principal de alunos para facilitar visualizar seus dados. A10 exige aproveitar mais largura no desktop, preservar contraste e edição/paginação e conter a rolagem horizontal na tabela em telas estreitas. Implementação na branch `feat/students-wide-card`, sem alargar a entrada do curso ou a tela de datas.
