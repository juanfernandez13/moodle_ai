# FULL-01 — revisão independente de especificação, pin4

Task / role / agent ID: FULL-01 / spec / /root/contract_review_spec.

Candidate revision: sha256:ad04237d5ef30724403d0dfc9ecc83b6e6ee00208fff7d5ec1ac2c41f89ed7e8.

Base declarada: 645413365f4d0c8cec9bbc021c020a85a206f504.

Result: **passed**. Decisão do eixo spec: **pass para este candidato e os nove recortes exatos abaixo**. Não há achado bloqueante nesta revisão. O delta documental resolve a incompatibilidade entre o método literal de QA F7 e a capacidade disponível, mantendo movimento reduzido obrigatório e a limitação explícita. A decisão de qualidade e a integração continuam sob seus papéis próprios.

## Delta e integridade verificados

Inspeção independente às 2026-10-12T19:09:46.219Z (staging) e 2026-10-12T19:09:46.354Z (cópia física): 199/199 tamanhos e SHA256 corretos, 184 caminhos alterados, nove digests corretos e 184 caminhos distintos nos recortes. Digest agregado calculado sobre bytes UTF8 de JSON.stringify(files), na ordem do manifest, sem indentação/LF; resultado igual ao pin4 acima.

Raiz: C:/Users/juanp/Documents/Codex/2026-10-12/vam/work/moodle-full. Cópia física: C:/Users/juanp/Documents/Codex/2026-10-12/vam/work/candidates/ad04237d5ef30724403d0dfc9ecc83b6e6ee00208fff7d5ec1ac2c41f89ed7e8.

Comparação direta com candidate-3.json e a cópia física preservada pin3: **198 arquivos byte-idênticos; único delta em docs/specs/FULL-01-application.md:40**, linha F7. Ambos os documentos têm 52 linhas; nenhum outro texto mudou. Hash anterior 97c1775e180578b7ed3ffaafb92500f3ae66170739f9547737c0b29dd233ed4d; hash novo a4121b58c91840675bee6e237e773feb121d4e07ed4b3df22b13b1601666c7bd. Somente o digest platform mudou; os outros oito são iguais ao pin3.

F7 anterior exigia movimento reduzido entre os casos no navegador. F7 atual mantém fluxos/layout/teclado/temas no navegador e exige reduced motion/invisibilidade/falhas no runtime real com media query/renderer simulados. A composição visual com preferência deve ser repetida quando houver emulação documentada; a ausência dessa capacidade deve ser declarada. O comportamento de produto continua obrigatório. A alteração corresponde ao diagnóstico ambiental registrado na revisão anterior e ao replan do método, sem terceira correção de produto.

Histórico do task conferido: reviewing→replan→planned→executing→verifying→reviewing, com corrections 2/maxCorrections 2 preservados e pin4 em reviewing. Nenhuma aplicação/teste/asset/fixture/dependência mudou. Busca em src/app/tests/scripts não encontrou consumo do documento alterado pela execução. Nova rodada de execução dos checks de produto não é necessária para esse delta documental.

## Ponte de evidência

verification-4.json e browser-4.md identificam pin4, pin3 anterior e o único hash documental alterado; declaram 198 arquivos iguais e reutilização explícita. Isso coincide com a comparação independente. Os registros de execução mantêm suas revisões verdadeiras:

- check-3.exit.json/log: npm run check no pin3, exit 0, typecheck/lint, 249 testes/249 pass/zero falhas, build Next e CLI completos. Log reconferido; SHA256 0359beb4eea664cccbea59c521f5dd644a94e3bf124269338262172af5d77da8.
- clean-install-2.log/exit.json: npm ci --ignore-scripts --offline, exit 0. package.json/package-lock.json são iguais entre pins2/3/4; verification-3.json já declarava essa reutilização. Nenhuma instalação pin4 foi alegada.
- browser.md, http-final-3.json e portable-legacy-3.json permanecem no pin3 real. browser-4.md faz a ponte explícita ao produto idêntico; não inventa browser/check/HTTP/download/emulação novos.
- review-spec-3.md foi preservado com a inspeção técnica completa e o diagnóstico F7. Seu SHA256 reconferido: 67c603d7747dad23f3d918e83a478753be7da795448e03563db402c50cb6e72e.

O método atualizado é compatível com a evidência já inspecionada: testes do runtime real medem pausa/retomada/pose neutra, RAF, listeners/observers, canvas e descarte; CUA/IAB não oferece emulação documentada de media query. Browser confirmou composição acessível, Fundooff/tema, entrada 3D e 360px. Não se afirma preferência reduzida ativada no navegador. O item F7 antes unverified está agora satisfeito pelo método fixado, com esse limite preservado.

## Resultado por aceite

As fontes de produto e as evidências de comportamento foram inspecionadas nesta mesma revisão independente no pin3, documentadas em review-spec-3.md. A igualdade byte a byte do pin4 permite transferir essa conclusão técnica, após revisar novamente o único requisito alterado. Cada resultado abaixo é do pin4, com execução anterior explicitamente vinculada.

| ID | Resultado | Evidência |
| --- | --- | --- |
| F1 | Satisfeito | Instalação limpa com dependências idênticas; check3 completo 249/249/typecheck/lint/builds; CLI anterior preservado/testado e demo independente com seis atividades; manual/offline sem IA. |
| F2 | Satisfeito | Contrato v1 aditivo/estrito, seis módulos/três questões, múltiplas atividades, metadados/datas/notas/anexos/conteúdo rico e IDs globais. showIssue real/control JSX e browser focam Nota máxima e Fechamento UTC; erros bloqueiam MBZ. Atividades de cinco/painéis, blocos recolhidos e tabela 100 linhas paginada/uma linha por edição; issue na linha 87 encaminha precisamente. S1/S2/S3 encerrados no produto inalterado. |
| F3 | Satisfeito | ProjectStore atômico com expectedRevision/snapshot antes de await e identidade de projeto independente do course ID. Portátil valida paths/versão/limites/CRC/hashes antes de substituição e preserva bytes/presets/fontes/provenance/IDs. Testes de corrupção/conflito; browser A7/B1 intactos/reabertos, erro JSON preservando projetos e portátil real anterior revalidado pelo código final. |
| F4 | Satisfeito | Duas estruturas DOCX, TXT/PDF com diagnóstico/preview/proposta explícita; mídia/ocorrências preservadas e conteúdo seguro. Offline/OpenAI/Gemini compartilham validação runtime, falhas e cancelamento sem troca automática. Next HTTP real TXT200/nove atividades, tópicos200/imagem, semanal200/duas seções, origem inválida403/plain415. Providers reais com HTTP simulado, sem chamada paga. |
| F5 | Satisfeito | Exportador puro por ID, XML/referências/hashes, seis módulos/três questões, notas/datas/arquivos/ocorrências e limites/cancelamento/concorrência. Quatro restaurações semânticas reais conferidas em laboratório; fonte/checker/entradas idênticos. MBZ real anterior baixado com nove módulos/126 arquivos/10454 bytes e users.xml vazio. |
| F6 / OPS-01 | Satisfeito | Modelos próprios de alunos/datas, revisão/hash vinculado, prévia/CSV/plano explícito, invalidação e confirmação sem envio em montagem. Adapter somente laboratório: Origin/session/schema/body, pares repetidos preservados, consumo único, deriva/partial/unknown/releitura sem retry cego. UI de produção confirmou login, CSV após erro/correção e sete alvos em prévia; lab comprovou criação/atualização/matrícula e sete datas com readback ligado ao SHA256 final de dates.ts. |
| F7 | Satisfeito segundo método revisado | browser3/ponte4: criar/importar/revisar, erros/foco, teclado de diálogo, 360px sem overflow/acesso às quatro ferramentas, temas, identidades/reabertura; downloads reais anteriores revalidados e sem alegação de novo download. WebMCP compartilhado, stale_revision/proposta explícita. Reduced motion/invisibilidade/falhas testados no runtime real com media query/renderer simulados; indisponibilidade de emulação no CUA registrada. Repetição da composição visual continua condicionada à capacidade documentada. |
| F8 | Satisfeito neste eixo | Dois contextos distintos de revisão definidos no task para o mesmo pin4; cópia física e todos os hashes conferidos. Limites de Moodle/IA/browser explicitados. Este parecer aprova spec; a decisão independente de qualidade e a integridade no destino da integração devem ser registradas pelo coordenador. |
| F9 | Satisfeito | Modelo 3D procedural Three local integrado junto ao título, ready 110×118 desktop/88×100 mobile, sem faixa adicional e formulário acessível. Runtime/geometrias reais com renderer simulado testam movimento discreto, neutralidade/pausa reduced/hidden/offscreen, WebGL ausente/perdido e descarte/remontagem. |
| F10 / BG01 | Satisfeito | Foto/atmosfera/Canvas2D reage ao ponteiro: campo 0→16.156px/luz 50→74.233%; Fundooff display:none/canvas0×0, reativação e tema sincronizados. Decorativo/aria-hidden/pointer-events:none atrás da interface, sem transformar formulário. Runtime/testes limitam DPR/pixels/partículas/FPS, toque estável, pausa/neutralidade/descarte/observadores/listeners e fallback estático. Desktop/360 comprovados. |

## Nove recortes aprovados no eixo spec

Aprovação limitada aos conteúdos/digests exatos. Copiar ou integrar composição com bytes diferentes exige verificação/revisão dos respectivos deltas. O coordenador conclui o aceite conjunto após a revisão independente de qualidade do mesmo pin.

| Recorte | Caminhos | Digest | Spec |
| --- | ---: | --- | --- |
| platform | 45 | sha256:cce60b2bee87cc1c463bd1b3c2f6c7fb21f77dc42791a9f6ceac3f66c8741b9f | pass |
| export | 13 | sha256:bf69b33e24fc2b67218d97bada62e7056d9fed1652f5adcc52032096d899206e | pass |
| import | 23 | sha256:91ec166f3abb893118473d807d30cb14cbc3449c7bc280243bf3421661a76d99 | pass |
| editor | 37 | sha256:19bd5bca049038c801040ca307b4a86882a950b7bace7c7633851a9252fdada2 | pass |
| students | 6 | sha256:ce1fb497ec52ba9fafb8d6a577925f559691a1d978b4506facbbde219980986a | pass |
| dates | 3 | sha256:b9b72462ead3297091959cb55b6c36de2ba9966240108a016574fad26c814216 | pass |
| operations | 31 | sha256:849f2987a6af9f97df50dca7fa3d1642ef2e159e1265abd2531ac5d2d812cf40 | pass |
| owl | 17 | sha256:0afceff370f13bf9e97b12fa2194386b442a4c436ede856c96f0ab849835f37f | pass |
| background | 9 | sha256:4244f716a3f8e8ad0230ea255001139684dc827159f73c5096d3f7e9e75ee89c | pass |

## Limites mantidos

Somente Moodle 4.1.17 Build20250317 core/perfil local possui restauração/OPS comprovadas, com cursos/contas fictícios localhost:3211; não a versão institucional 4.1.17+/20250321 nem plugins externos. Nenhum IFCE foi acessado. OpenAI/Gemini foram testados com HTTP simulado, sem chamada paga. Downloads reais são anteriores/revalidados no código final. Movimento reduzido não foi emulado no navegador; o método atual registra os testes do runtime e a capacidade faltante. Desempenho de GPUs/dispositivos físicos não foi medido. Coruja 3D e fundo Canvas2D são descritos separadamente sem claim de cenário 3D.

Revisor read-only: nenhum Git/fonte/task JSON foi alterado; somente review-spec.md escrito. Não houve nova execução de produto nesta rodada documental. Checks/probes próprios anteriores (31 testes/zero falhas e oito casos HTTP reais), inspeção visual das capturas e quatro verificações semânticas de restauração permanecem preservados com sua revisão real em review-spec-3.md. O relatório de qualidade não foi usado nesta análise.

Reconferência final após a decisão: 2026-10-12T19:12:18.871Z (staging); 2026-10-12T19:12:18.981Z (cópia física): 199/199 iguais, nove digests corretos e mesmo digest agregado pin4.
