# QA parcial de navegador — pin2

Candidate: `sha256:54d88e51f1d98d838ce4bd4120031758676e360cf7d05e565d740da97207af8a`.

Aplicação de produção construída por check-2, `http://127.0.0.1:3210/`, navegador IAB. Moodle exclusivamente `http://localhost:3211`, dados fictícios. Nenhum Moodle do IFCE acessado. Este candidato foi rejeitado por S3/F2 antes da conclusão da QA completa; este registro não é aprovação.

- Reload após build: entrada carregou a coruja real, `data-owl-state=ready`, um canvas, 110×118 CSS px. Script observado somente `/three-owl/three.browser.js`; fallback não cobre o canvas pronto. Viewport observado 1280×720, documento1265px sem overflow horizontal; altura874px, scroll154px. Captura no topo em `outputs/Moodle-AI-coruja-3D.jpg`.
- Tema escuro inicial, troca para claro e Fundo desligado. Modelo conserva canvas; cenário possui controle independente. Verificação móvel e preferência de movimento reduzido ainda pendentes no navegador. Cinco testes de runtime exercitam movimento reduzido/aba oculta/viewport/fallback e cleanup, com geometrias Three reais e renderer simulado.
- Importação JSON do draft real do DOCX completo (curso fictício7), com títulos A e B distintos e o mesmo `course-source-1-1`. Duas propostas explícitas exibiram 1 unidade/9 atividades e foram aplicadas. Ambas exibiram `Salvo neste navegador · revisão0`; contagem de projetos aumentou, sem conflito entre esses cursos. Não se afirma duas novas uploads DOCX nesta rodada; importações DOCX e bytes foram exercitados no pin1, em testes e nas quatro restaurações reais.
- Teclado no diálogo de proposta: Shift+Tab do Fechar levou ao último Abrir; Tab voltou ao Fechar; Escape fechou e devolveu foco a Validar e conferir JSON.
- WebMCP consultou IDs/contagens do projeto B; validate com expectedRevision999 retornou stale_revision. Proposta de renomear activity-source-1-3 retornou awaiting_user_review; get_activity ainda leu título anterior antes da aplicação. Somente botão Aplicar alterações conferidas mudou título/revisão1 e autosave confirmou.
- Conferir curso exibiu as nove atividades e aviso de glossário/perfil local; Gerar backup marcou revisão1; Baixar curso MBZ gerou o arquivo real `Downloads/moodle-course-source-1-1.mbz`, 10454bytes. A chamada da ponte de download demorou942s apesar do timeout declarado20s, impedindo comunicação durante a chamada. Nenhuma espera deliberada longa foi feita.
- S3 foi encontrado pelo revisor em probe independente com função showIssue e controles reais: issue Nota máxima/Fechamento foca Título. Correção2 foi autorizada ao autor e será validada num novo pin.

A prova de portátil anterior está em portable-browser-1.json. QA final de reabertura, erros, instrumentos alunos/datas, telas móveis e campo exato será registrada no pin3. Os limites deste registro permanecem explícitos.
