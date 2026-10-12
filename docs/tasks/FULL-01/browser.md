# QA de navegador — candidato final

Revision: **sha256:3d3c7883e7ac3566794af4cd1174c6dcab2581cea1840d881c933f11d1bf34e0**.

Produção Next local em http://127.0.0.1:3210/, controlada pelo CUA no navegador do Codex. Apenas dados fictícios. Moodle acessado exclusivamente pelo laboratório em http://localhost:3211; nenhum acesso ao Moodle IFCE. Fonte congelada antes dos testes, reconferida pelo manifesto.

## Fundo e coruja

- Desktop confirmado pelo DOM: viewport1280×720, documento1265×874, sem overflow horizontal. Coruja WebGL `ready`,110×118, biblioteca local. Formulário e navegação continuam clicáveis.
- Fundo ativado: `data-field-state=interactive`. Clique na margem vazia moveu o ponteiro; `--field-x` foi de0 para16.156px, `--field-y`8.667px e `--field-light-x` de50% para74.23339460655384%. Parallax/luz reagem ao cursor. Camada de vegetação/partículas usa canvas2D; não se afirma cenário3D.
- Fundo desligado: wrapper `display:none`, canvas0×0, estado static. Reativar recompôs a camada; tema noturno sincronizou fotografia, atmosfera e componentes. Testes de lifecycle inspecionam RAF/listeners/observers/pausa/dispose, além da observação visual.
- Mobile confirmado: viewport360×800, documento345×1040, sem overflow horizontal; coruja `ready`,88×100; Fundo interativo e todas as quatro ferramentas da navegação acessíveis. Imagens carregadas. Não há faixa adicional para a coruja. Capturas em outputs/Moodle-AI-fundo-interativo.jpg e Moodle-AI-mobile.jpg.
- Movimento reduzido/aba oculta/offscreen/falha WebGL e canvas são exercitados nos testes significativos do runtime. Não se afirma alteração/emulação do ajuste do sistema operacional pelo navegador.

## Curso, validação, persistência e teclado

- Depois de carregar o build novo, Projetos salvos mostrou quatro projetos. A e B vieram do mesmo CourseDraft.id, mantiveram identidades independentes: A revisão0 e B revisão1. A abriu sem alterações de B. Após QA de campos A chegou à revisão7 válida; B permaneceu revisão1, confirmado ao reabrir após reload. Nenhuma colisão/sobrescrita.
- Tarefa Plano de estudo: Abertura original2026-10-12T08:00-03:00 exibida11:00 UTC; Fechamento23:59-03 exibido02:59 UTC do dia seguinte. Apenas navegar não normalizou o timestamp; só uma edição real mudou o valor.
- Nota máxima0 causou pendência `settings.maxGrade`; MBZ desabilitado. Clicar na pendência fechou modal e focou o controle com `data-field=settings.maxGrade`, label Nota máxima, value0. Corrigir para10 removeu o erro.
- Fechamento10:00 UTC anterior à abertura11:00 UTC causou pendência `schedule.closesAt`; MBZ desabilitado. Clicar focou `data-field=schedule.closesAt`, label Fechamento (UTC), value2026-10-12T10:00. Restaurado2026-10-19T02:59 e curso voltou à estrutura válida/salvo.
- O preenchimento CUA de datetime mudou inicialmente apenas o DOM nativo. Eventos nativos ArrowUp/ArrowDown fizeram a edição real, observada na revisão e na conferência; não confundimos um DOM preenchido com alteração do modelo.
- Lista de nove atividades dividida em duas páginas, cinco na primeira; edição da atividade em Conteúdo/Configuração e datas/Anexos. Metadados em três painéis. Testes reais de showIssue/controles cobrem demais caminhos, inclusive linha87 de tabela, questões/pares/alternativas/essay/conteúdo rico.
- JSON `{INVALID` mostrou diagnóstico específico, preservando os quatro projetos. Abrir Projetos salvos mostrou A7/B1 intactos; Escape fechou e devolveu foco ao botão Projetos salvos(4). Trap de Tab/ShiftTab e retorno ao iniciador assíncrono verificados também no QA anterior, fonte do modal preservada no candidato final.
- WebMCP descoberto novamente após reload; get_course_summary retornou B revisão1, nove atividades, zero issues. validate_course(expectedRevision999) retornou stale_revision. A proposta anterior aplicada por UI persistiu apenas em B. A chamada de proposta não aplica alterações; os testes e browser-2.md registram a confirmação explícita na interface.
- Console de erros da aba final: lista vazia. Captura final do editor substituiu a captura antiga em outputs/Moodle-AI-editor-desktop.jpg.

## Alunos e datas no laboratório

- Planilha de exemplo, dois alunos fictícios: email inválido bloqueou prepararCSV. Correção bruno.qa@example.test permitiu a revisão/CSV identificado772356f3fdc8. Login fictício pela UI de produção conectou com sucesso, sem invalid_origin.
- Navegar a Datas preservou a sessão local; Carregar cursos listou seis cursos fictícios. Curso de paridade fictício copy2 selecionado, Ler datas atuais carregou os alvos. Conferir mudanças mostrou prévia de sete alvos com abertura/fechamento anterior e novo em UTC, fingerprint1edcdae5ce1046f0 e botão Confirmar alterações de datas. Nenhuma aplicação feita por essa QA de interface.
- Criação/atualização/matrícula e aplicação/readback das sete datas já executados no laboratório com fixtures fictícias: tests/moodle/lab-evidence.json, lab-database-evidence.json e q2-lab-readback.json. Q2 corresponde ao hash final de dates.ts. Outros destinos são bloqueados pelo adapter.

## Arquivos reais e limites de evidência

- MBZ baixado realmente na QA anterior do mesmo exportador/editor: docs/tasks/FULL-01/mbz-browser-2.json. Pacote deB/revisão1,9módulos,126arquivos, users.xml vazio; arquivo10454bytes, SHA25632bfb04c9e9c3933b658fc34fbf2138651eb87b4334a8f64044fcd3f59c5bcb5. Verificado pelo parser independente, sem repetir download nativo lento.
- Portátil realmente baixado/importado antes: portable-browser-1.json. O arquivo4877bytes foi lido pelo código final e salvo/reaberto com igualdade completa de projeto, presets, fontes e bytes; portable-legacy-3.json liga essa execução ao pin final e verifica identidade legada.
- Importação por HTTP real final de TXT/DOCX tópicos/DOCX semanal: http-final-3.json. Providers OpenAI/Gemini têm adapters testados com fixtures HTTP, sem chamada paga/chave real nesta execução.
- Quatro MBZ restaurados no Moodle local4.1.17/build20250317, com snapshots/semântica independente em docs/lab. Não se afirma compatibilidade comprovada com4.1.17+/20250321 institucional nem paridade completa com o original.
- A ferramenta de download/upload nativo apresentou atrasos longos na QA anterior. Por isso os arquivos reais existentes foram revalidados no código final; não se registra download pin3 que não ocorreu.
