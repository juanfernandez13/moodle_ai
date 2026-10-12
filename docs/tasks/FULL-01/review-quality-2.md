# FULL-01 — revisão independente de qualidade do pin 2

Task / role / agent ID: FULL-01 / quality / `/root/contract_review_quality`.
Candidate revision: `sha256:54d88e51f1d98d838ce4bd4120031758676e360cf7d05e565d740da97207af8a`.
Base declarada: `645413365f4d0c8cec9bbc021c020a85a206f504`.
Result: **needs-fix**. Q1/Q2/Q3 estão corrigidos neste candidato; S3/F2 e a QA incompleta impedem aprovação global. Este parecer não aprova fontes posteriores ou merge.

## Integridade e independência

Recomputei SHA256(JSON.stringify(candidate.files)), UTF-8 sem LF final: resultado igual à revisão acima. Na abertura da rodada, os bytes/tamanhos/hashes dos **187 arquivos**, sendo **172 alterados**, coincidiram tanto na staging quanto na cópia física `work/candidates/54d88e51f1d98d838ce4bd4120031758676e360cf7d05e565d740da97207af8a`. Os oito subconjuntos têm entradas idênticas às globais e seus digests foram recomputados:

| Scope | Arquivos | Digest confirmado |
| --- | ---: | --- |
| platform | 42 | sha256:ba62fd06d4664eab33ad4da6dac4fac17a44ceea33edd36eb3d3d122fc00efc3 |
| export | 13 | sha256:bf69b33e24fc2b67218d97bada62e7056d9fed1652f5adcc52032096d899206e |
| import | 23 | sha256:dd3e682469b6520a3f95c0e747dcbc94bbe83b637b8857e5e759a3208ff9e197 |
| editor | 37 | sha256:50115a8f383160cebbadfdfb93556372a963ae84ab125e864410b0bd5edd54ec |
| students | 6 | sha256:ce1fb497ec52ba9fafb8d6a577925f559691a1d978b4506facbbde219980986a |
| dates | 3 | sha256:b9b72462ead3297091959cb55b6c36de2ba9966240108a016574fad26c814216 |
| operations | 31 | sha256:073f8dba6344807d00ed11f68f727ce5dbb86ac140a1a627ad4661b3a8d20cc1 |
| owl | 17 | sha256:0afceff370f13bf9e97b12fa2194386b442a4c436ede856c96f0ab849835f37f |

O mapeamento é pelos scopes do manifesto; não infere nomes de branches Git. Segui AGENTS.md, FULL-01 F1–F9, OPS-01 e o papel quality da skill project-loop. Não participei da implementação FULL-01, não usei parecer de spec ou narrativa de executor como justificativa e não alterei produto/testes/task records. CodeGraph MCP não está disponível; usei fontes e interfaces públicas. A única escrita própria desta rodada é este relatório.

Após a comunicação da rejeição por S3, as fontes de UI da staging foram reabertas para correção. A inspeção do achado e a conferência final de integridade usam a **cópia física congelada**, não a staging em mutação. Antes de gravar este parecer, `candidate-2.json` ainda produziu o digest correto e os 187 arquivos físicos continuaram iguais, sem divergência.

## Correções verificadas por probes independentes

### Q1 — import / platform: origem e transporte antes do provedor

Localizações do pin 2: `src/server/import/request-policy.ts:16–51`, `app/api/interpret/route.ts:9–11` e `app/api/import/route.ts:26–28`.

As duas rotas aplicam a política antes de ler o corpo ou procurar chave do servidor. Repeti o repro da rodada 1 com `OPENAI_API_KEY` sintética e fetch totalmente simulado, sem rede/chave real:

- JSON com origem externa, em text/plain ou application/json: HTTP 403, zero chamadas.
- Multipart externo, Origin ausente ou Origin null: HTTP 403, zero chamadas.
- Origem legítima com text/plain: HTTP 415, zero chamadas.
- Origem legítima com application/json: HTTP 200 e exatamente uma chamada simulada; chave ausente da resposta.

`tests/import/routes.test.ts` verifica essas fronteiras, incluindo variantes de origem, os dois transportes, erros sanitizados e preservação do fluxo legítimo. Q1 não reproduziu no pin 2.

### Q2 — operations / dates: todos os pares na deriva e na releitura

Localizações: `src/server/moodle/dates.ts:62–73`, consumidores em :89, :155 e :164; ativação de checkbox em :31–40.

A representação conserva todos os valores e sua ordem por nome, mantendo as normalizações explícitas de campos voláteis. Repeti o transporte fictício de `MoodleClient` em localhost:3211 com três valores tags[] e último valor fixo:

- Reordenação dos valores anteriores após a prévia: moodle_state_changed, zero POSTs.
- Servidor simulado descarta os valores anteriores depois do POST: apenas um POST; applied=0, unknown=1, not_applied=2, partial=true.
- Servidor preserva todos os valores: três POSTs/applied=3 e ordem ['second','first','last'] intacta.

As regressões públicas também cobrem mudança de valor, ordem, IDs voláteis e checkbox com hidden 0 + checked 1. Não são espelhos de semantic(): verificam efeitos antes e depois do transporte. `tests/moodle/q2-lab-readback.json` vincula a prova local de sete alvos ao SHA256 `9af9b013bc440c45d650e8830875b1af0587b7cde190d49942620fc6ab6cb159` desta fonte. Eu não repeti mutações reais do laboratório. Q2 não reproduziu no pin 2.

### Q3 — editor / platform: snapshot próprio do armazenamento

Localização: `src/client/project-store.ts:43–45`, usado em toda a transação :49–67.

Repeti o repro original usando fake-indexeddb em memória: depois de save(next,0) iniciar, acrescentei ao argumento um anexo sem bytes. save resolveu; load da identidade original retornou o snapshot válido da revisão 1, com zero anexos, igual à cópia capturada antes da mutação. O objeto do chamador continuou com seu anexo inválido; ele não entrou na transação. Q3 não reproduziu no pin 2.

Identidade e compatibilidade foram conferidas em `project.ts:41–60`, migração `project-store.ts:8–26`, portátil `portable.ts:35–39,94,225` e consumidores de identidade na UI/WebMCP. As regressões importam os dois DOCX de fato, confirmam cursoID igual, projectIDs diferentes e bytes/proveniência distintos, salvam ambos, preservam o segundo durante conflito do primeiro e restauram a identidade portátil. A migração mantém o store legado como recuperação e lê portáteis v1 sem projectId. Essa adição não reescreve IDs do CourseDraft.

UTC foi conferido em `src/client/dates.ts:2–16` e seus consumidores de curso/atividade/chat. Probe com TZ UTC, America/Fortaleza e Asia/Tokyo produziu sempre display 2026-10-13T02:30 para 2026-10-12T23:30:34-03:00 e escrita 2026-10-13T02:31:00.000Z. Edição não relacionada preserva o timestamp original; o campo explícito UTC tem precisão visual de minuto.

## Achado ainda bloqueante

### S3 / F2 — P2: validação seleciona a atividade, mas foca o primeiro campo visível

Scope: **editor**. Localizações no snapshot: `app/page.tsx:307–377`, especialmente :368–375; `src/client/components/activity-editor.tsx:539–548,601–611,637–652,674–687`.

Após o alerta compartilhado pelo eixo spec, confirmei o mecanismo diretamente na fonte congelada. showIssue resolve a entidade mais próxima pelo caminho, abre a atividade/painel adequado e usa `querySelectorAll('input,textarea,select').find(control => control.getClientRects().length > 0)?.focus()`. O Título da atividade está sempre visível e precede abertura, fechamento e Nota máxima no DOM. Para caminhos settings.maxGrade ou schedule.closesAt, a entidade mais próxima é a atividade; o algoritmo não identifica o campo exato e seleciona Título.

Reprodução: numa tarefa, deixar Nota máxima inválida, validar o curso e escolher a pendência; repetir com fechamento anterior à abertura. O painel Configuração e datas é aberto, mas o foco chega a Título da atividade. O erro continua bloqueando exportação; a falha afeta a navegação para correção e o aceite F2, que exige levar ao campo. Não executei este fluxo num navegador próprio: a confirmação independente desta revisão é pela fonte do snapshot; a ocorrência observável está registrada no QA parcial. Não li o parecer do outro revisor como prova.

Correção necessária: mapear o caminho da pendência ao controle correspondente e testar o foco efetivo, incluindo Nota máxima e datas. Exige outro pin e nova revisão; as fontes retomadas na staging não estão cobertas por este parecer.

## Verificação e cobertura dos oito scopes

Execução independente, saída 0, **226 testes aprovados**:

`node --test --test-reporter=dot tests/domain/*.test.ts tests/shared/*.test.ts tests/export/*.test.ts tests/import/*.test.ts tests/client/*.test.ts tests/students/*.test.ts tests/dates/*.test.ts tests/moodle/*.test.ts tests/visual/*.test.ts`

Não executei os nove testes CLI que criam temporários, respeitando a restrição de escrita. Inspecionei `check-2.log`/`check-2.exit.json`: typecheck, lint sem warnings, **235 testes /235 aprovados /0 falhas**, build Next e build CLI, exit 0. `clean-install-2.log`/exit registra npm ci --ignore-scripts --offline, exit 0, 216 packages adicionados e 0 vulnerabilidades na auditoria. Os exits não contêm revision; o vínculo desta revisão usa a verificação independente do snapshot na abertura/final e o registro de QA explicitamente fixado no pin 2. Esses gates não superam S3 ou a QA incompleta.

| Scope | Avaliação de qualidade |
| --- | --- |
| platform | Corpos reais limitados antes de parsing, UTF-8/JSON controlados, ZIP com paths/CRC/quantidade/limites antes e durante inflação. Lockfile/configuração/scripts e ferramentas CLI mantidos. Instalação/check registrados, documentação separa prova local de capacidades não avaliadas. Nenhum novo bloqueio além do aceite integrado de UI. |
| export | Digest igual ao pin 1 já inspecionado. Contrato revalidado, bytes clonados e resolvidos por ID, erros localizados para ausências/divergências, XML/HTML escapados, referências de conteúdos/questões/notas/imagens e hashes verificados. Testes públicos cobrem determinismo, limites, cancelamento e concorrência; todos foram repetidos nesta rodada. |
| import | Documentos como dados, imagens externas/DOCTYPE recusados, assets e ocorrências separados, offline delimitado, respostas IA validadas sem fallback automático. Limites e falhas sanitizadas continuam testados. Q1 corrigido e regressão independente confirmada nos dois transportes. |
| editor | Comandos por ID/revisão, invalidação do aceite após edição, React textual/imagens de MIME permitido, portátil estrito/hashes, persistência atômica e conflitos. Q3, identidade independente, migração e UTC conferidos. Foco de S3 permanece incorreto; UI completa não aprovada. |
| students | Scope idêntico ao pin 1 inspecionado: limites CSV/XLS/XLSX, mapeamento explícito, valores originais/IDs, duplicados/CPF/e-mail, fórmulas recusadas, prévia/hash invalidada por edição. Testes repetidos. Sem envio em montagem nem novo bloqueio técnico encontrado. QA integrada final ainda pendente. |
| dates | Scope idêntico ao pin 1: plano próprio com timezone/revisão/hash, before/after e condições não relacionadas preservadas. Testes repetidos; Q2 corrigido no adapter consumidor. QA integrada final ainda pendente. |
| operations | Origem/URL fixas no laboratório, sessões opacas/TTL/limites, cookie httpOnly, schemas e corpos limitados, confirmação consumida antes do await, lock e estados unknown/parcial sem retry cego. HTTP não encaminha cookies/redirecionamentos a outra origem. Q2 corrigido; novos pares e checkbox testados. |
| owl | Runtime e modelo procedural inspecionados. Bundle local r186/hash/licença conferidos, import somente após montagem, canvas decorativo sem foco/interceptação e tamanho compacto em CSS. Pausa reduzida/ocultação/viewport, fallback de contexto e limpeza idempotente de frames/listeners/observers/GPU/canvas exercitados com modelo/bundle real e renderer simulado. Probe próprio do loader confirmou concorrência única, retry após erro e rejeição de revisão incorreta. |

## QA parcial e limites

Inspecionei `browser-2.md`, fixado nesta revisão, e os pixels de `outputs/Moodle-AI-coruja-3D.jpg`. A captura mostra a coruja compacta junto ao título, formulário acessível e controles de ferramentas/aparência. O registro observa WebGL real state ready/canvas 1/110×118 e somente script local, tema/Fundo independentes, dois projetos com cursoID igual, teclado em proposta, revisão/proposta WebMCP e download real do MBZ. São evidências do QA do orquestrador, não ações que eu repeti.

Meu navegador não estava disponível: cua.getState retornou apps=[]/browsers=[] e IAB indisponível. Não contornei essa limitação. QA de 360px, movimento reduzido real, reabertura/erros/instrumentos e campo exato ainda está pendente no registro. Testes do runtime não medem GPU física ou substituem esses fluxos visuais.

Restauração e operações documentadas continuam limitadas ao Moodle fictício local **4.1.17 Build20250317**; não comprovam 4.1.17+ /20250321, outros plugins/instâncias ou contas reais. Não houve acesso ao Moodle IFCE nem chamada paga de IA nesta revisão. Publicação/produção/licença não são aprovadas por este parecer.

Próximo passo: corrigir S3, congelar novo candidato e completar checks/QA/revisões nele. O resultado desta rodada permanece **needs-fix**, mesmo com Q1/Q2/Q3 resolvidos.

