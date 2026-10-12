# FULL-01 — revisão independente de especificação, pin2

Task / role / agent ID: FULL-01 / spec / `/root/contract_review_spec`.

Candidate revision: `sha256:54d88e51f1d98d838ce4bd4120031758676e360cf7d05e565d740da97207af8a`.

Base declarada: `645413365f4d0c8cec9bbc021c020a85a206f504`.

Decisão final deste pin: **needs-fix**. Result: **changes-requested**. S3 impede F2. O coordenador confirmou que o encaminhamento ao campo é exigido e encerrou esta rodada rejeitada antes de concluir o gate de navegador. Não há aprovação do candidato agregado nem autorização de integração dos recortes.

Limite da evidência de navegador: consultado `browser-2.md`, QA parcial do mesmo pin. Confirma entrada 3D desktop, temas/Fundo independentes, duas propostas JSON com mesmo course ID e projetos distintos, diálogo por teclado, WebMCP sem aplicação automática e download real MBZ. Não conclui 360px, movimento reduzido no navegador, reabertura/portátil, ferramentas alunos/datas e foco no campo exato. Não há aprovação completa de F7/F9. A sessão computer-use deste revisor retornou `apps=[]/browsers=[]`; não houve inspeção visual própria nem interferência na QA do coordenador. Nova revisão depende do próximo pin e de sua evidência completa.

## Integridade e limites

Conferidos SHA256 e tamanho dos 187 caminhos do manifest, digest agregado e oito digests de funcionalidade. Reconferência às `2026-10-12T18:26:28.804Z`/`.992Z` e final às `2026-10-12T18:41:15.795Z`/`.945Z`: staging e cópia física `work/candidates/54d88e51f1d98d838ce4bd4120031758676e360cf7d05e565d740da97207af8a` iguais, zero divergências. O digest final permanece `sha256:54d88e51f1d98d838ce4bd4120031758676e360cf7d05e565d740da97207af8a`. O digest usa UTF8 de `JSON.stringify(files)`, na ordem do manifest. Há 172 caminhos alterados.

Inspeção de AGENTS, project-loop/roles, PRD, arquitetura, FULL-01/OPS-01 e fontes/testes por funcionalidade. CodeGraph indisponível conforme contexto; usados fontes e testes locais. Nenhum Git, fonte, task JSON ou Moodle IFCE foi operado. Somente este relatório foi escrito. Evidências Moodle referem-se exclusivamente a dados fictícios em `http://localhost:3211`.

## Achado bloqueante

### S3 — P2 — F2: ação de corrigir pendência foca outro campo

Local: `app/page.tsx:362–374`, especialmente seleção do primeiro controle visível em 370–374. `src/client/components/activity-editor.tsx:603–611` mantém Título da atividade antes dos controles afetados; datas ficam em 637–652.

Requisito: F2 exige que a validação leve ao campo. O painel abre corretamente, mas a escolha do foco ignora o campo indicado em `issue.path`.

Reprodução local sem alterar arquivos: Node 24, hooks TypeScript para renderizar o `ActivityEditor` real com ReactDOMServer; função `showIssue` real extraída de `app/page.tsx` e transpilada, executada contra os controles desse HTML. A visibilidade considera ancestrais hidden, conforme `.application [hidden] { display:none !important }`. `validateDraft` produziu as issues e o probe capturou o label do controle que recebeu `.focus()`:

| Entrada | Issue | Foco esperado | Foco observado |
| --- | --- | --- | --- |
| Tarefa com `settings.maxGrade=0` | `sections[0].activities[0].settings.maxGrade` | Nota máxima | Título da atividade |
| Tarefa com abertura `2026-10-12T12:00:00Z`, fechamento `2026-10-12T11:00:00Z` | `sections[0].activities[0].schedule.closesAt` | Fechamento (UTC) | Título da atividade |

Impacto: a pessoa, inclusive pelo teclado, precisa localizar novamente o campo inválido após selecionar a pendência. O título é válido e não corresponde aos dois erros. Mensagem localizada e bloqueio da exportação funcionam, mas não satisfazem o encaminhamento exigido por F2.

Correção necessária: relacionar o caminho canônico da issue ao controle efetivo; usar fallback para entidade/painel quando a issue for estrutural e não houver controle correspondente. Conferir `document.activeElement` para nota, fechamento e campos de curso/questão, mantendo os casos de bloco/célula com seleção da página correta. Os testes atuais de navegação/célula verificam entidade e linha, mas não identificam este erro de foco de campo simples.

## Correções anteriores conferidas

- S1 UTC: `src/client/dates.ts` converte o instante com `toISOString()` antes de preencher curso, atividades e chat. Entrada 09:00-03:00 aparece 12:00 UTC; edição 12:01 resulta 12:01Z. Mudança de outro campo conserva a string original e seus segundos. Helpers e renderização real passaram.
- S2 tabela: preview limita a cinco linhas com paginação; editor seleciona uma linha, mantendo dados/blocos. Tabela de 100 linhas mostrou cinco na prévia e uma no editor; issue em linha 87 abriu precisamente célula 87, sem renderizar as outras 99 linhas. Atividades têm página de cinco; blocos são recolhidos e questões/conceitos possuem seleção.
- Conferidos snapshot antes do await em `ProjectStore.save`, identidade independente dos projetos importados, Origin/Content-Type antes de chamar IA e pares repetidos ordenados no fingerprint/POST/readback das datas. Testes de falha/concorrência/repetição passaram. Readback fictício Q2 corresponde ao SHA256 atual de `src/server/moodle/dates.ts`.

## Evidências verificadas

- `clean-install-2.log` + `clean-install-2.exit.json`: `npm ci --ignore-scripts --offline`, exit 0. EPERM inicial de sandbox foi preservado separadamente, seguido pela instalação concluída.
- `check-2.log` + `check-2.exit.json`: `npm run check`, exit 0; typecheck, lint, 235 testes/zero falhas, build Next e build CLI completos. Fontes verificadas após o término continuam no pin2.
- Reexecução independente: `node --test tests/client/dates.test.ts tests/client/content.test.ts tests/client/project.test.ts tests/import/routes.test.ts tests/moodle/dates.test.ts tests/visual/motion.test.ts tests/visual/runtime.test.ts`, 41 testes/zero falhas, exit 0.
- Reexecução independente: `npm run demo`, exit 0; fixture anterior válida, revisão 3, uma seção/seis atividades/três anexos.
- Quatro reexecuções de `scripts/check-lab-snapshot.mjs`, exit 0: restored-full/full-course/assets (curso 4, 9 atividades/4 questões/10 arquivos/6 ocorrências); restored-topicos/topicos-com-imagens.draft/assets (curso 5, 1 atividade/1 questão/2 arquivos/3 ocorrências); restored-semanas/semanas-em-tabela.draft/assets (curso 6, 1 atividade/zero questões/zero arquivos); complete-restored/complete-draft/assets (curso 7, 9 atividades/3 questões). Conferidos campos, referências, notas/pesos, instantes e hashes, além de contagens.
- `browser-2.md`: produção após check2, mesmo digest. Coruja `data-owl-state=ready`, um canvas110×118 e bundle local; temas/Fundo independentes. Projetos A/B com course ID igual salvos separadamente; foco de diálogo/Tab/Escape; WebMCP stale_revision e proposta aplicada somente por ação explícita; nove atividades no resumo e MBZ baixado com 10454 bytes. O registro se declara parcial e lista verificações pendentes; não foi usado para inferir sua conclusão.

## Aceites nesta revisão rejeitada

| Critério | Resultado | Evidência |
| --- | --- | --- |
| F1 | Satisfeito | Instalação/check2/CLI anterior e caminho offline/manual. |
| F2 | Incorreto — S3 | Seis módulos/três questões, metadados/datas/notas/anexos/conteúdo rico existem. Bloqueio/localização funcionam; foco de campo simples não atende. |
| F3 | Satisfeito em fontes/testes; browser parcial | Portátil valida paths/hashes/versões/limites antes de substituir; IndexedDB atômico/revisão esperada/snapshot/identidades distintas; testes de corrupção/conflito/bytes/fontes/presets/IDs. Browser2 confirma dois projetos com course ID igual; reabertura/portátil pendentes neste pin. |
| F4 | Satisfeito | Duas estruturas DOCX, TXT/PDF com diagnóstico, mídia por ocorrência, proposta explícita, providers sem fallback e validação runtime comum; HTTP simulado e rotas. |
| F5 | Satisfeito | Exportador puro por IDs, limites/cancelamento/concorrência, XML/referências/hashes e restauração semântica de quatro fixtures; scope export não mudou desde pin1. |
| F6 | Satisfeito em fontes/testes/lab; browser pendente | Modelos próprios, CSV/plano vinculados à revisão/hash, invalidação/confirmação explícita sem envio na montagem; adapter restrito/consumo único/deriva/partial/unknown e readback real fictício. |
| F7 | Não verificado completamente | Browser2 confirma temas, propostas, WebMCP, diálogo pelo teclado e download; mobile, erros, reabertura e ferramentas não concluídos. S3 confirma falha de foco no editor. |
| F8 | Integridade satisfeita; processo conjunto pendente | Cópia física e staging iguais. Esta revisão não aprova o eixo qualidade nem sua decisão. |
| F9 | Fontes/testes satisfeitos; browser parcial | Modelo procedural Three real/local junto ao título, 110×118/88×100, pausa/pose neutra, ausência de loop oculto, fallback WebGL/limpeza; cinco testes de runtime/motion com geometrias reais. Browser2 comprova canvas real110×118 e tema; mobile/reduced motion no navegador pendentes. |

## Oito recortes fixados

S3 rejeita o recorte editor no digest abaixo. Os outros sete recortes foram inspecionados e não têm desvio spec confirmado nas verificações realizadas, mas recebem revisão parcial, sem aprovação final de integração: o gate integrado de navegador não terminou para este pin rejeitado. Aprovação de recortes exige o próximo candidato congelado, checks e navegador completos e ambas as revisões. Os digests abaixo identificam exatamente o que foi revisado e preservado; não são aprovações inferidas.

| Recorte | Caminhos | Digest | Estado |
| --- | ---: | --- | --- |
| platform | 42 | `sha256:ba62fd06d4664eab33ad4da6dac4fac17a44ceea33edd36eb3d3d122fc00efc3` | Inspecionado, browser pendente |
| export | 13 | `sha256:bf69b33e24fc2b67218d97bada62e7056d9fed1652f5adcc52032096d899206e` | Inspecionado, sem desvio confirmado |
| import | 23 | `sha256:dd3e682469b6520a3f95c0e747dcbc94bbe83b637b8857e5e759a3208ff9e197` | Inspecionado, sem desvio confirmado |
| editor | 37 | `sha256:50115a8f383160cebbadfdfb93556372a963ae84ab125e864410b0bd5edd54ec` | Rejeitado — S3 / needs-fix |
| students | 6 | `sha256:ce1fb497ec52ba9fafb8d6a577925f559691a1d978b4506facbbde219980986a` | Inspecionado, browser pendente |
| dates | 3 | `sha256:b9b72462ead3297091959cb55b6c36de2ba9966240108a016574fad26c814216` | Inspecionado, browser pendente |
| operations | 31 | `sha256:073f8dba6344807d00ed11f68f727ce5dbb86ac140a1a627ad4661b3a8d20cc1` | Inspecionado, sem desvio confirmado |
| owl | 17 | `sha256:0afceff370f13bf9e97b12fa2194386b442a4c436ede856c96f0ab849835f37f` | Inspecionado, browser pendente |

## Limites reais

Compatibilidade provada somente Moodle 4.1.17 Build20250317 core/perfil local de operações. A referência 4.1.17+/20250321 e plugins externos não foram testados. OpenAI/Gemini foram exercitados com HTTP simulado, sem chamada cobrada com chave real. Offline, extração, exportação e operações fictícias locais possuem evidências próprias. F9 usa renderer simulado nos testes de geometrias; desempenho de GPU/dispositivos físicos não foi medido. Esses limites estão declarados no produto/docs e não são falhas por si mesmos.
