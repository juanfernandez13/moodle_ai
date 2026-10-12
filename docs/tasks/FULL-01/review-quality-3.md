# FULL-01 — revisão independente de qualidade do pin 3

Task / role / agent ID: FULL-01 / quality / `/root/contract_review_quality`.
Candidate revision: `sha256:3d3c7883e7ac3566794af4cd1174c6dcab2581cea1840d881c933f11d1bf34e0`.
Base declarada: `645413365f4d0c8cec9bbc021c020a85a206f504`.
Result: **pass** no eixo de qualidade deste candidato local. Nenhum bloqueio técnico concreto permanece nas fronteiras examinadas. Q1/Q2/Q3, S3/F2 e a integração Origin/Host no Next real foram verificados como corrigidos. O parecer não substitui o eixo spec nem aprova fontes futuras, publicação ou compatibilidade externa.

## Integridade e independência

Recomputei SHA256(JSON.stringify(candidate.files)), UTF-8 sem LF final, obtendo a revisão acima. Na abertura e novamente após a QA final, todos os **199 arquivos**, sendo **184 alterados**, coincidiram em bytes/tamanho/hash na staging e na cópia física `work/candidates/3d3c7883e7ac3566794af4cd1174c6dcab2581cea1840d881c933f11d1bf34e0`. Nenhuma divergência. Os nove subconjuntos tiveram digest recomputado e cada entrada foi comparada ao manifesto global:

| Scope | Arquivos | Digest confirmado |
| --- | ---: | --- |
| platform | 45 | sha256:461a6d6a34b096e346da6c8a05afe12ca352bd8af732db5198a299325ffde770 |
| export | 13 | sha256:bf69b33e24fc2b67218d97bada62e7056d9fed1652f5adcc52032096d899206e |
| import | 23 | sha256:91ec166f3abb893118473d807d30cb14cbc3449c7bc280243bf3421661a76d99 |
| editor | 37 | sha256:19bd5bca049038c801040ca307b4a86882a950b7bace7c7633851a9252fdada2 |
| students | 6 | sha256:ce1fb497ec52ba9fafb8d6a577925f559691a1d978b4506facbbde219980986a |
| dates | 3 | sha256:b9b72462ead3297091959cb55b6c36de2ba9966240108a016574fad26c814216 |
| operations | 31 | sha256:849f2987a6af9f97df50dca7fa3d1642ef2e159e1265abd2531ac5d2d812cf40 |
| owl | 17 | sha256:0afceff370f13bf9e97b12fa2194386b442a4c436ede856c96f0ab849835f37f |
| background | 9 | sha256:4244f716a3f8e8ad0230ea255001139684dc827159f73c5096d3f7e9e75ee89c |

Esse é o mapeamento das frentes plataforma/exportação/importação/editor/alunos/datas/operações/coruja/fundo pelo manifesto; não infere nomes ou estado de branches Git. A integração Git pertence ao orquestrador. Os arquivos de base também foram conferidos no conjunto global.

Segui AGENTS.md, FULL-01 F1–F10, OPS-01, BG01 e o papel quality de project-loop. Não implementei FULL-01, não li o parecer spec como justificativa nem usei narrativa de executor para aprovar. CodeGraph MCP indisponível; inspeção de fontes, interfaces públicas, testes e registros de QA foram usados. Não executei Git nem alterei produto/testes/task records. A única escrita própria desta rodada é este relatório.

## Correções e fronteiras verificadas

**Q1 — import/platform.** `src/server/import/request-policy.ts:16–50`, `app/api/interpret/route.ts:9–11`, `app/api/import/route.ts:26–28`: origem e transporte são verificados antes do corpo e das credenciais do provedor. Regressões repetidas confirmam 403/zero chamadas para origens externas/ausentes/null e 415/zero chamadas para JSON enviado como text/plain. Provedores legítimos continuam funcionando com chave sintética e fetch simulado; a chave não aparece na resposta.

**Integração Origin/Host do Next — platform/import/operations.** Os probes das rodadas anteriores criavam Request.url público diretamente; não comprovavam a reconstrução interna do Next. O defeito real posterior era HTTP 403 para a origem legítima 127.0.0.1:3210 porque o Next fornecia Request.url localhost:3210. Inspecionei `src/shared/request-origin.ts:5–21` e seus consumidores, incluindo `src/server/moodle/api.ts:74`. A exceção exige Host válido e correspondente, dois aliases loopback e porta 3210; forwarded headers não autorizam origem.

Probe próprio de 20 variantes do helper passou. Repeti as rotas JSON/multipart com Request.url interno localhost:3210 e Host/Origin públicos 127.0.0.1:3210: 200 e uma chamada simulada por pedido legítimo; negativos 403/zero chamadas. Host externo pareado com Origin externo, forwarded alias, portas diferentes, credenciais/path em Host/Origin e aliases cruzados foram recusados. text/plain legítimo permaneceu 415/zero chamadas.

Depois do build, executei **22 POSTs HTTP reais**, destino somente 127.0.0.1:3210. Dezoito pedidos com corpo {} às rotas interpret/login comprovaram 422 de entrada para Host/Origin correspondentes em 127 ou localhost e 403 invalid_origin para sete variantes negativas por rota, incluindo Host externo+forwarded local. Corpos vazios não iniciaram login ou provedor. Os quatro pedidos restantes comprovaram interpretação JSON e importação multipart TXT fictícios offline 200/ok, multipart externo 403 e JSON text/plain legítimo 415. O acesso local precisou da autorização automática de rede após EACCES no sandbox; nenhuma fonte foi escrita ou destino externo acessado. `http-final-3.json`, com revision correta, acrescenta os dois DOCX reais, planejamento completo de nove atividades e login/catálogo no laboratório fictício. O defeito de integração não reproduziu no pin 3.

**Q2 — operations/dates.** `src/server/moodle/dates.ts:62–73,89,143–164`: digest da fonte continua igual ao pin 2 corrigido. O fingerprint mantém todos os pares e a ordem por nome; readback compara todos os campos, além das datas. Os testes públicos repetidos recusam deriva de valores anteriores com o último fixo, recusam mudança de ordem antes de enviar e interrompem após releitura que perde pares. Não espelham apenas semantic(): verificam POSTs e estados applied/unknown/not_applied. O probe independente da rodada anterior resultou em zero POSTs para deriva, um POST/unknown para perda e três applied com preservação dos pares. Checkbox mantém hidden 0 + checked 1. `q2-lab-readback.json` liga sete applied à fonte SHA256 `9af9b013bc440c45d650e8830875b1af0587b7cde190d49942620fc6ab6cb159`, igual à fonte final. Eu não repeti mutações reais do laboratório.

**Q3 e identidade — editor/platform.** `src/client/project-store.ts:43–67` captura e valida structuredClone antes de qualquer await e usa somente esse snapshot na transação. Fonte igual ao pin 2 corrigido; regressões públicas repetidas preservam o snapshot quando o chamador muda durante save e impedem sobrescrita por conflito. O repro próprio anterior salvou o objeto válido mesmo após acrescentar anexo inválido ao argumento. projectId identifica o workspace separadamente do CourseDraft.id; migração v1, portátil legado e dois DOCX reais com courseID igual são cobertos. A QA final reabriu A7 e B1 independentes após reload. `portable-legacy-3.json` confirma igualdade de IDs/preset/fontes/anexos/proveniência do arquivo realmente baixado anteriormente, incluindo identidade legada.

**S3/F2 — editor.** `src/client/navigation.ts:34–101`, `app/page.tsx:307–354`, controles em `activity-editor.tsx:665,699,747`: showIssue seleciona painel/entidade e focusIssueField procura o data-field relativo exato. Refs primitivas de anexos/atividades usam IDs estáveis; problemas estruturais focam sua entidade. Os testes transpilam controles TSX reais e executam showIssue extraído da fonte com DOM simulado, verificando Nota máxima, fechamento, metadados, questão/alternativa/par/essay, reordenação e texto/imagem na linha 87 de tabela. Meu probe adicional de entidade/campo ignorou um Título anterior e selecionou os sete alvos esperados. `browser.md` documenta os dois repros originais no build final: Nota0 e fechamento anterior à abertura bloquearam MBZ e focaram settings.maxGrade/schedule.closesAt; a correção real removeu as pendências. S3 não permanece neste pin.

UTC em `src/client/dates.ts` e controles preserva o instante durante leitura e mudanças não relacionadas. Probes com UTC/Fortaleza/Tokyo foram iguais; QA final observou offsets originais apresentados em UTC, com mudança do modelo apenas após evento real de edição. Precisão de minuto pertence ao campo editável, sem normalização automática ao navegar.

## Avaliação dos nove scopes

| Scope | Fronteiras e avaliação |
| --- | --- |
| platform | Corpos limitados antes de parsing, JSON/UTF-8 controlados, ZIP com paths/CRC/contagens/limites antes e durante inflação. Contrato CourseDraft v1 aditivo/estrito, IDs globais inclusive tabelas/pares/entradas, entradas preservadas e erros localizados. Shared Origin conferido com Next real. Configuração/lockfile/CLI e diagnóstico das capacidades mantidos. |
| export | Digest igual ao pin 2 inspecionado. Revalidação, bytes clonados/resolvidos por ID, hashes, XML/HTML escapados e referências de atividades/questões/notas/mídias. Determinismo, limites, cancelamento e concorrência repetidos nos testes públicos. Download real MBZ anterior pertence ao mesmo exportador; não foi inventado novo download pin3. |
| import | Documentos como dados; DOCTYPE/mídia externa recusados, ocorrências/assets separados, offline delimitado, respostas IA revalidadas e sem fallback automático. Limites/cancelamento/falhas sanitizadas continuam testados. Política Origin/Host/Content-Type funciona em mocks e produção HTTP local. |
| editor | Comandos por ID/revisão, edição invalida aceite, estado anterior preservado em erro, React textual/imagens permitidas, portátil estrito/hashes, IDB atômico/conflitos/migração. Q3/identidade/UTC/S3 corrigidos. Fonte de modal e confirmação explícita WebMCP preservadas; testes e QA cobrem revisão obsoleta, teclado e reabertura. |
| students | Digest igual ao pin 2. Limites CSV/XLS/XLSX, mapeamento explícito, valores originais/IDs, duplicados/CPF/e-mail e fórmulas recusadas. Hash/prévia invalidados por edição, sem envio em montagem. QA final bloqueou e corrigiu e-mail fictício; envio real prévio tem evidência restrita ao laboratório. |
| dates | Digest igual ao pin 2. Plano próprio com timezone/revisão/hash/before-after e preservação de condições não relacionadas. Testes repetidos; consumidor Q2 corrigido. QA final mostrou sete alvos antes/depois e confirmação explícita, sem aplicar por montagem ou por abrir prévia. |
| operations | Alvo fixo localhost:3211; sessões opacas/TTL/limites/cookie httpOnly, schemas/corpos limitados. Confirmação consumida antes do await, lock/estados unknown/parcial e ausência de retry cego. HTTP limita resposta/tempo e não encaminha cookies/redirecionamentos a outra origem. Q2 e Origin no Next corrigidos. Login real de QA ocorreu apenas no laboratório fictício. |
| owl | Digest igual ao pin 2. Modelo/bundle local r186 e licença, carga compartilhada/retry, canvas decorativo e dimensões compactas. Testes usam geometria/bundle reais e renderer simulado para pausa reduzida/ocultação/viewport/contextlost/limpeza idempotente de GPU/frames/listeners/observers. QA final observa WebGL ready110×118 desktop e88×100 mobile. |
| background | Nova camada fixa e decorativa atrás da workspace, aria-hidden/pointer-events:none, sem transformar formulário. Fotos locais/proveniência preservadas e nenhum novo pacote/CDN. Runtime/React effect têm cancelamento de import atrasado, pausa, retomada sem avançar tempo oculto e dispose idempotente; canvas ausente/falha conserva foto estática. Trabalho normal limitado a30fps, DPR1,25/1,5, backing buffer1,6M e12/24 partículas. |

BG01 foi inspecionado integralmente em field/runtime/componente/CSS e integração Shell. Os sete testes significativos passaram, cobrindo 360px/limites/posição, resposta ao ponteiro e toque, reduced/hidden/offscreen, off/reinício, resize e fallback. Meu probe adicional com desktop/DPR8 e100 trocas de tema manteve um único RAF; ocultação impediu pintura, callbacks atrasados de frame/resize/intersection após dispose não desenharam ou reagendaram, listeners ficaram em zero, dois observers desconectados, buffer/CSS liberados e exceção getContext deixou fallback sem eventos. Eventos pointermove são ignorados enquanto pausado; monitores de retomada permanecem até o dispose. Fundo off/desmontagem/falha de desenho removem todos os recursos. Não há cenário 3D alegado: profundidade vem de fotografia/camadas/canvas2D.

## Checks, QA e limites

Execução independente, saída0, **240 testes não CLI aprovados**:

`node --test --test-reporter=dot tests/domain/*.test.ts tests/shared/*.test.ts tests/export/*.test.ts tests/import/*.test.ts tests/client/*.test.ts tests/students/*.test.ts tests/dates/*.test.ts tests/moodle/*.test.ts tests/visual/*.test.ts tests/visual-background/*.test.ts`

Não executei os nove testes CLI que criam temporários, respeitando a escrita limitada. Inspecionei check-3.log/exit.json: typecheck, lint sem warnings, **249/249 testes,0 falhas**, build Next16.4.0 e build CLI, exit0/revision correta. verification-3.json vincula os gates e os199 hashes ao pin. A instalação limpa npm ci --ignore-scripts --offline exit0 é reaproveitada de clean-install-2 porque package.json e package-lock.json são byte-idênticos; não se afirma instalação nova. Nenhuma dependência foi acrescentada para BG01.

Li browser.md e inspecionei pixels de Moodle-AI-fundo-interativo.jpg, Moodle-AI-mobile.jpg e Moodle-AI-editor-desktop.jpg. Capturas mostram formulário/editor e quatro ferramentas acessíveis, coruja compacta e cenário sem faixa adicional. O registro final observa viewport1280×720/360×800 sem overflow horizontal, parallax0→16,156px e luz50→74,23%, off/displaynone/canvas0, retomada/tema, foco exato nos dois erros, projetos independentes, JSON inválido preservando estado, Escape/foco, WebMCP stale_revision, alunos e prévia de datas fictícios. São ações do QA do orquestrador, distintas dos meus probes HTTP/código/testes; meu CUA não tinha superfícies disponíveis nesta revisão.

Movimento reduzido, aba oculta/offscreen e falhas de WebGL/canvas são comprovados por testes do runtime, não por emulação real do ajuste do sistema operacional nesta QA. Desempenho/GPU/toque de aparelhos físicos não foi medido. Downloads nativos pertencem às rodadas anteriores e foram revalidados pelo código final; não houve novo download pin3 alegado. Esses limites estão explícitos em browser.md e não foram tratados como nova ocorrência de defeito.

Restaurações/operações demonstradas pertencem exclusivamente ao Moodle fictício local **4.1.17 Build20250317**. Não comprovam a referência **4.1.17+/20250321**, outros plugins/instâncias ou contas reais. Adapters OpenAI/Gemini têm HTTP simulado; chamadas pagas não foram avaliadas. Nenhum acesso ao Moodle IFCE ocorreu nesta revisão. Paridade completa com o original, publicação/produção e licença não são aprovadas.

Decisão final do eixo quality: **pass**, restrita ao digest confirmado e aos limites acima. Não há correção técnica solicitada nesta rodada.
