# FULL-01 — revisão independente de especificação, pin3

Task / role / agent ID: FULL-01 / spec / /root/contract_review_spec.

Candidate revision: sha256:3d3c7883e7ac3566794af4cd1174c6dcab2581cea1840d881c933f11d1bf34e0.

Base declarada: 645413365f4d0c8cec9bbc021c020a85a206f504.

Result: **passed no eixo técnico dos nove recortes**. Não foi encontrado novo defeito funcional. **O gate agregado deste pin requer replan do método de QA F7**: a preferência de movimento reduzido não foi exercitada no navegador, embora o comportamento tenha passado nos testes do runtime real. Não há aprovação final de integração do candidato agregado enquanto esse requisito literal/evidência não for resolvido em nova revisão. Essa limitação não solicita terceira correção de produto e não altera o orçamento 2/2.

## Integridade e escopo

Conferidos SHA256 e tamanho de todos os 199 caminhos, dos quais 184 alterados, e os nove digests de funcionalidade. Reconferência após check/QA final às 2026-10-12T19:03:16.579Z (staging) e 2026-10-12T19:03:16.776Z (cópia física): zero divergências. Os nove recortes abrangem exatamente 184 caminhos distintos. Digest calculado sobre os bytes UTF8 de JSON.stringify(files), na ordem do manifesto, sem indentação/LF. O resultado é o pin acima. Reconferência final da cópia física preservada após gravar este relatório às 2026-10-12T19:08:52.018Z: 199/199 iguais e mesmo digest agregado.

Raiz inspecionada: C:/Users/juanp/Documents/Codex/2026-10-12/vam/work/moodle-full. Cópia conferida: C:/Users/juanp/Documents/Codex/2026-10-12/vam/work/candidates/3d3c7883e7ac3566794af4cd1174c6dcab2581cea1840d881c933f11d1bf34e0.

Lidos AGENTS, project-loop/roles, PRD/arquitetura, FULL-01, OPS-01, BG01, task/manifest e fontes/testes por funcionalidade. CodeGraph indisponível conforme contexto; inspeção local utilizada. Nenhum Git, fonte ou task JSON editado. Somente este relatório foi escrito. Nenhum acesso ao IFCE. Evidências de operações/restauração usam exclusivamente laboratório localhost:3211 e dados fictícios.

A revisão de qualidade mantém contexto independente. Sua decisão formal pass foi informada pelo coordenador; seu relatório não foi usado para produzir esta análise. A integração e o fechamento do task pertencem ao coordenador.

## Resultado por critério

| Critério | Resultado | Evidência e comportamento conferidos |
| --- | --- | --- |
| F1 | Satisfeito | check-3.log/check-3.exit.json: typecheck, lint, 249/249 testes e builds Next/CLI, exit 0. clean-install-2.log/exit.json comprova npm ci --ignore-scripts --offline, exit 0; package.json e package-lock.json têm exatamente os mesmos hashes entre pins 2/3, verificados independentemente. verification-3.json documenta esse reaproveitamento; nenhuma instalação pin3 foi inventada. CLI anterior passou no check e demo foi reexecutado no pin2 com contrato inalterado. Entrada manual/offline funciona sem IA. |
| F2 | Satisfeito | CourseDraft v1 aditivo/estrito, IDs globais e defaults explícitos. Seis módulos/três questões, múltiplas atividades por seção, metadados/notas/datas/anexos/texto/imagens/tabelas são editáveis e preservados. src/client/navigation.ts:29–99 relaciona issue.path ao campo relativo à entidade estável; app/page.tsx:307–352 seleciona painel/página e encaminha. Testes com showIssue/controles JSX reais e browser.md confirmam Nota máxima e Fechamento UTC; erros bloqueiam MBZ. Atividades paginadas de cinco, blocos recolhidos, tabela de 100 linhas com preview de cinco/edição de uma linha e navegação precisa à linha 87. |
| F3 | Satisfeito | src/client/project-store.ts captura snapshot antes de await, IndexedDB atômico e expectedRevision impedem sobrescrita de outra aba. Identidade de projeto independe do course ID. portable.ts valida versão/paths/quantidade/tamanho/CRC/hashes antes de substituição. Testes preservam bytes, presets, fontes/provenance/IDs e projeto anterior em corrupção/conflito. browser.md registra A/B independentes após reload, A7/B1 intactos em JSON inválido. portable-legacy-3.json liga o arquivo real anterior ao código final e ao roundtrip completo de 4877 bytes. |
| F4 | Satisfeito | documents/offline/providers/index e testes de importação cobrem dois DOCX, TXT/PDF com diagnóstico, mídia por ocorrência e proposta explícita. Conteúdo seguro, PDF escaneado sem exemplo/OCR inventado, mesma validação runtime para offline/OpenAI/Gemini, falhas/cancelamento sem troca automática de provider. http-final-3.json atravessa Next real: TXT200/nove atividades, DOCX tópicos200/imagem, DOCX semanal200/duas seções; Content-Type415 e origens inválidas403 antes do processamento. Providers reais exercitados com HTTP simulado, sem chamada paga. |
| F5 | Satisfeito | src/server/export e testes: builders puros, referências por ID, XML escapado, seis módulos/três tipos de questão, notas/pesos/datas/arquivos/imagens por ocorrência, limites/cancelamento/concorrência e erros localizados. Quatro restaurações reais em docs/lab têm conferência semântica independente de campos, referências, instantes e hashes. O recorte export, checker e suas 15 entradas de restauração/readback verificadas permanecem iguais ao pin2. mbz-browser-2.json registra download real: nove módulos/126 arquivos, users.xml vazio, SHA256 e 10454 bytes; não é download pin3. |
| F6 / OPS-01 | Satisfeito | Modelos students/dates próprios; CSV/plano vinculados à revisão/hash, invalidação após edição, confirmação explícita e ausência de envio em montagem. UI final mostrou erro de email bloqueante, CSV revisado, login fictício válido, seis cursos e prévia de sete alvos sem aplicação automática. OPS restringe destino ao laboratório, valida Origin/session/schema/body, preserva pares ordenados, consome prévia uma vez, recusa deriva e distingue partial/unknown sem retry cego. lab-evidence/lab-database-evidence e q2-lab-readback comprovam criação/atualização/matrícula e sete datas aplicadas/releituras; sourceSha256 do readback coincide com dates.ts final. |
| F7 | **Não verificado integralmente no método literal** | browser.md no pin3 e capturas confirmam criar/importar/revisar, erros/foco de campo, salvar/reabrir, teclado de diálogo, 360px sem overflow/acesso às quatro ferramentas e temas. Arquivos realmente baixados anteriormente foram revalidados no final; exportador/portátil não mudaram. WebMCP usa comandos compartilhados, expectedRevision e proposta explícita; stale_revision e aplicação por UI comprovados. Movimento reduzido passou nos testes do runtime real, mas a preferência não foi ativada/emulada no navegador. Ver ressalva abaixo. |
| F8 | Integridade/eixo spec satisfeitos; gate conjunto depende do replan F7 | Dois revisores distintos designados para o mesmo pin; 199 hashes/tamanhos e cópia física conferidos. Capacidades/versões/IA e limites reais estão declarados. Este relatório aprova o eixo técnico dos recortes, preserva a distinção do gate agregado e não declara integração já realizada. |
| F9 | Satisfeito funcionalmente | Coruja procedural Three local integrada na entrada real, junto ao título, sem faixa adicional. Capturas/DOM final ready 110×118 desktop e 88×100 mobile; interface acessível. Geometrias reais/testes de runtime/motion cobrem pose neutra, pausa por reduced/hidden/offscreen, WebGL ausente/perdido, recursos tardios e descarte/remontagem. A preferência reduzida no navegador tem o limite de método de F7. |
| F10 / BG01 | Satisfeito funcionalmente | Camada foto/atmosfera/Canvas2D reage ao ponteiro; variáveis observadas de0→16.156px e luz 50→74.233%. Fundo off esconde a camada e zera canvas; reativação/tema sincronizam aparência. Camada aria-hidden/pointer-events:none atrás da interface não transforma formulário. field/runtime/tests limitam DPR, pixels, partículas e FPS, mantêm toque estável, suspendem desenho/interação em hidden/offscreen/reduced e limpam listeners/observers/RAF/buffer no dispose. Canvas ausente/falha mantém foto estática. Desktop/360 comprovados; nenhum claim de cenário3D. |

## Correções reproduzidas e encerradas no eixo técnico

- S1 UTC: instantes com offset são convertidos antes de preencher controles UTC; navegar/editar outro campo conserva a string original. Browser final mostra 08:00-03:00 como 11:00 UTC e23:59-03:00 como 02:59 UTC do dia seguinte. Testes incluem instantes/segundos e chat.
- S2 tabela: preview paginado/edição de uma linha preservam todas as linhas e IDs. Teste real abre célula da linha 87 sem exibir as outras 99; atividades têm páginas de cinco e edição em painéis.
- S3 campo exato: assignment.settings.maxGrade=0 foca data-field=settings.maxGrade, label Nota máxima; fechamento10:00 anterior à abertura11:00 UTC foca data-field=schedule.closesAt, label Fechamento (UTC). Ambos bloqueiam MBZ. Browser final corrigiu A para revisão7 válida e reabriu B revisão1 intacto. Testes reais cobrem metadados, statement/maxMark, alternativas/feedback, matching/essay e fallback estrutural.
- Integração Origin do Next: helper src/shared/request-origin.ts aceita somente alias loopback da porta3210 com Host correspondente, sem confiar em forwarded. Testes e HTTP de produção cobrem URL interno localhost/Origin127 legítimo e rejeitam ausência/null/externo/Host conflitante. Login válido deixou de receber403; origens inválidas continuam rejeitadas.

## Verificação independente desta rodada

- node --test tests/shared/request-origin.test.ts tests/client/content.test.ts tests/client/dates.test.ts tests/visual-background/field.test.ts tests/visual-background/runtime.test.ts tests/import/routes.test.ts tests/moodle/api.test.ts: **31 testes, zero falhas, exit 0**. Testes de foco usam a função showIssue e controles reais; lifecycle mede frames/listeners/observers/backing pixels, sem depender somente de contadores do autor.
- Probe HTTP read-only contra produção Next local às 2026-10-12T18:54:10.479Z–.545Z: **oito casos conforme esperado, exit 0**. Interpret offline200/duas atividades; origem ausente/externa/alias conflitante/Host forjado403; plain415; login com campos vazios422 (guard legítimo atravessado); login cross-origin403. Sem credentials/provider pago/IFCE. A conexão exigiu execução fora do sandbox por EACCES de loopback; ação read-only aprovada automaticamente.
- Quatro execuções anteriores independentes de check-lab-snapshot.mjs, exit 0, mantidas por igualdade dos hashes do checker e de todas as entradas: curso4 nove atividades/quatro questões/dez arquivos/seis ocorrências; curso5 uma atividade/uma questão/dois arquivos/três ocorrências; curso6 uma atividade/tabela/seções semanais; curso7 nove atividades/três questões. Esses números acompanham verificações de valores/referências/hashes, não as substituem.
- Consultados check-3.exit.json, log completo/check 249, verification-3.json, http-final-3.json, portable-legacy-3.json, browser.md, artefatos de download reais e snapshots/readback. Inspecionadas as três capturas finais desktop/fundo/mobile. A sessão CUA deste revisor não expôs superfícies; interação de navegador foi executada e registrada pelo coordenador, sem alegação de QA interativa própria.

## Nove recortes tecnicamente aprovados

Os digests identificam exatamente os recortes que passaram neste eixo. A aprovação técnica não conclui o gate agregado F7 nem autoriza integrar uma composição diferente. O novo pin documental exige nova revisão e ponte explícita dos hashes/evidências; não herda aprovação agregada por inferência.

| Recorte | Caminhos | Digest | Eixo técnico spec |
| --- | ---: | --- | --- |
| platform | 45 | sha256:461a6d6a34b096e346da6c8a05afe12ca352bd8af732db5198a299325ffde770 | pass |
| export | 13 | sha256:bf69b33e24fc2b67218d97bada62e7056d9fed1652f5adcc52032096d899206e | pass |
| import | 23 | sha256:91ec166f3abb893118473d807d30cb14cbc3449c7bc280243bf3421661a76d99 | pass |
| editor | 37 | sha256:19bd5bca049038c801040ca307b4a86882a950b7bace7c7633851a9252fdada2 | pass |
| students | 6 | sha256:ce1fb497ec52ba9fafb8d6a577925f559691a1d978b4506facbbde219980986a | pass |
| dates | 3 | sha256:b9b72462ead3297091959cb55b6c36de2ba9966240108a016574fad26c814216 | pass |
| operations | 31 | sha256:849f2987a6af9f97df50dca7fa3d1642ef2e159e1265abd2531ac5d2d812cf40 | pass |
| owl | 17 | sha256:0afceff370f13bf9e97b12fa2194386b442a4c436ede856c96f0ab849835f37f | pass |
| background | 9 | sha256:4244f716a3f8e8ad0230ea255001139684dc827159f73c5096d3f7e9e75ee89c | pass |

## Ressalva de gate e limites comprovados

F7 exige UI testada no navegador, incluindo movimento reduzido. browser.md declara que não houve alteração/emulação da preferência; testes do runtime comprovam pausa/composição neutra/retomada/dispose, e Fundooff foi observado no browser, mas isso não comprova a preferência ativada no browser. O coordenador consultou capabilities/documentação CUA: somente visibility/viewport, sem emulateMedia. Shell headless não é permitido pelo ambiente. Portanto esse subcaso permanece **unverified** no pin3, sem defeito de implementação identificado. Não marcar F7/agregado aprovado com a redação literal atual.

Project-loop SKILL.md, seção Decide: “Invalid requirement, incompatible architecture or missing environment capability: replan with the diagnosis.” O coordenador informou replan restrito ao método QA, mantendo reduced motion obrigatório, fontes de produto idênticas e budget 2/2. Uma alteração de FULL-01 muda um hash do manifesto e exige novo pin/ponte/revisão próprios. O revisor não editou nem aprovou antecipadamente esse delta.

Restauração/operação comprovadas somente Moodle 4.1.17 Build20250317 core/perfil local; não 4.1.17+/20250321 institucional nem plugins externos. OpenAI/Gemini foram testados por adapters HTTP simulados, sem chamada paga. Downloads reais são anteriores, revalidados no código final, sem inventar download pin3. Desempenho em GPUs/dispositivos físicos não foi medido. O fundo é Canvas2D sobre fotos; a coruja é 3D. Essas capacidades/limitações estão descritas nas fontes/docs e não constituem novo defeito funcional.
