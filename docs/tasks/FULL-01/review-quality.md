# FULL-01 — revisão independente de qualidade do pin 4 documental

Task / role / agent ID: FULL-01 / quality / `/root/contract_review_quality`.
Candidate revision: `sha256:ad04237d5ef30724403d0dfc9ecc83b6e6ee00208fff7d5ec1ac2c41f89ed7e8`.
Base declarada: `645413365f4d0c8cec9bbc021c020a85a206f504`.
Result: **pass** no eixo quality, restrito ao candidato local e aos limites de evidência declarados. Nenhum novo bloqueio técnico concreto foi encontrado.

## Integridade e delta

Recomputei SHA256(JSON.stringify(candidate-4.files)), UTF-8 sem LF final, igual ao digest acima. Conferi bytes/tamanho/hash dos **199 arquivos**, sendo **184 alterados em relação à base**, na staging e na cópia física `work/candidates/ad04237d5ef30724403d0dfc9ecc83b6e6ee00208fff7d5ec1ac2c41f89ed7e8`: zero divergências.

Comparei o conjunto com candidate-3.json e o texto da especificação com a cópia física do pin 3. Não há arquivo novo/removido. O único delta é **docs/specs/FULL-01-application.md:40, linha F7**:

- Antes: 8409 bytes, SHA256 `97c1775e180578b7ed3ffaafb92500f3ae66170739f9547737c0b29dd233ed4d`.
- Depois: 8741 bytes, SHA256 `a4121b58c91840675bee6e237e773feb121d4e07ed4b3df22b13b1601666c7bd`.

Os **198 arquivos restantes são byte-idênticos**, incluindo todos os executáveis, testes, fixtures, assets, dependências e snapshots locais. Recomputei os nove feature digests e comparei suas entradas ao manifesto global; todos coincidem:

| Scope | Arquivos | Digest confirmado |
| --- | ---: | --- |
| platform | 45 | sha256:cce60b2bee87cc1c463bd1b3c2f6c7fb21f77dc42791a9f6ceac3f66c8741b9f |
| export | 13 | sha256:bf69b33e24fc2b67218d97bada62e7056d9fed1652f5adcc52032096d899206e |
| import | 23 | sha256:91ec166f3abb893118473d807d30cb14cbc3449c7bc280243bf3421661a76d99 |
| editor | 37 | sha256:19bd5bca049038c801040ca307b4a86882a950b7bace7c7633851a9252fdada2 |
| students | 6 | sha256:ce1fb497ec52ba9fafb8d6a577925f559691a1d978b4506facbbde219980986a |
| dates | 3 | sha256:b9b72462ead3297091959cb55b6c36de2ba9966240108a016574fad26c814216 |
| operations | 31 | sha256:849f2987a6af9f97df50dca7fa3d1642ef2e159e1265abd2531ac5d2d812cf40 |
| owl | 17 | sha256:0afceff370f13bf9e97b12fa2194386b442a4c436ede856c96f0ab849835f37f |
| background | 9 | sha256:4244f716a3f8e8ad0230ea255001139684dc827159f73c5096d3f7e9e75ee89c |

Somente o digest platform mudou, pela especificação. O mapeamento das nove frentes usa o manifesto, sem inferir nomes/estado de branches Git.

## Avaliação do método F7

O delta preserva os comportamentos exigidos de movimento reduzido, invisibilidade e falhas. Explicita como verificá-los com o runtime de produção e media query/renderer simulados; exige também a composição visual sob a preferência quando houver emulação documentada no navegador controlado. A indisponibilidade deve ser registrada, sem afirmar que a emulação ocorreu. F9, F10 e BG01 não foram alterados.

Conferi novamente os pontos relevantes dos testes e fontes: `tests/visual/runtime.test.ts:139` monta mountOwl importado do runtime de produção, usa modelo/bundle locais e renderer simulado, verifica pausa/retomada por viewport, ocultação e mudança da preferência e fallback no contexto WebGL. `tests/visual-background/runtime.test.ts:109–138` monta mountBackground real, altera matches/dispara change, confere frames zero, estado estático, profundidade neutra, ausência de pintura por ponteiro e retomada com um frame. Os casos de descarte/falha conferem recursos removidos. Ambos os runtimes conectam o ambiente de navegador a window.matchMedia('(prefers-reduced-motion: reduce)'). Essa é verificação comportamental das implementações de produção, não somente teste de uma função que espelha um booleano.

O método documentado é compatível com a evidência efetivamente disponível: browser-4.md registra a limitação CUA/IAB e não a transforma em emulação realizada. Testes com ambiente/renderer simulados não comprovam aparência da composição com a preferência real, GPU/desempenho ou aparelhos físicos. Essa limitação permanece explícita. Não alterei preferência do sistema, estado oculto de navegador nem usei headless externo para contorná-la.

## Ponte de evidência e cobertura

Li verification-4.json/browser-4.md e reconferi check-3.exit.json/verification-3.json. A ponte identifica o pin 3 de execução real, os hashes antes/depois e a igualdade dos198 arquivos; não rotula checks/browser/HTTP/portátil antigos como execuções novas.

O parecer próprio preservado `review-quality-3.md` tem SHA256 `4f53aaf07966b6c5b00859440a9cfae81afe1841d39263629c4da6013c48276a`, igual ao relatório que emiti. Ele documenta a inspeção das nove frentes, correção Q1/Q2/Q3/S3 e integração Origin/Host no Next real. A identidade das fontes permite reutilizar esses resultados sem nova suposição de implementação:

| Scope | Avaliação aplicável ao pin 4 |
| --- | --- |
| platform | Contrato v1 aditivo/estrito, IDs e limites, parsing/archives, Origin/Host, dependências/CLI continuam iguais. Única mudança documental F7 revisada nesta rodada. |
| export | Mesmos builders, resoluções por ID/bytes/hashes, escape XML/HTML, determinismo, limites/cancelamento/concorrência e evidências de restauração. |
| import | Mesmos parsers offline/IA, validação, preservação de ocorrências/fontes, limites/cancelamento, política de transporte e HTTP local verificado. |
| editor | Mesmos comandos por revisão/ID, snapshot IDB, identidade independente, migração/portátil, UTC, foco data-field, modais e WebMCP. Correções e QA anteriores permanecem aplicáveis. |
| students | Mesmos modelos/limites/mapeamentos/fórmulas, validação/hash/prévia e bloqueio de envio após edição; fixtures continuam fictícias. |
| dates | Mesmo plano timezone/revisão/hash/before-after, condições preservadas e ausência de envio por montar/reabrir. |
| operations | Mesmo alvo fixo localhost:3211, sessões/TTL/cookies/limites/locks, confirmação de consumo único, readback completo e estados unknown/parcial sem retry cego. |
| owl | Mesmo runtime/modelo/bundle local/licença, dimensões compactas, preferência/pausas/fallback e limpeza de frames/listeners/observers/GPU. Limite de composição visual sob preferência explicitado. |
| background | Mesma camada fixa/decorativa sem transformar formulário, fotos locais, limite DPR/partículas/pixels, parallax/luz, pausa/retomada/dispose e fallback. Nova redação não muda o cenário nem afirma cenário3D. |

Resultados reais reaproveitados do pin 3: check global **249/249 testes**, typecheck/lint/build Next/build CLI, exit0; minha execução independente de **240 testes não CLI**,20 variantes de origem, probes de lifecycle e **22 POSTs HTTP locais**; QA desktop/360px/foco/identidade/teclado/temas/fundo e imagens; HTTP TXT/DOCX/login fictício; portátil legado e snapshots do laboratório. A instalação limpa exit0 continua ligada ao package.json/lockfile byte-idênticos. Não repeti o total de testes ou operações nesta rodada documental e não alego novas execuções de navegador/download.

O registro de tarefa mostra replan→planned→executing→verifying→reviewing e orçamento **2/2**, sem reinício de correções. Esse registro foi lido apenas para verificar a coordenação; nenhum task record foi editado por mim.

## Independência, limites e decisão

Revisão de qualidade independente, seguindo AGENTS.md/project-loop, FULL-01/OPS-01/BG01. Não participei da implementação nem usei parecer spec/narrativa de executor como justificativa. CodeGraph MCP indisponível. Nenhum produto/teste/task/Git foi alterado; única escrita nesta rodada é review-quality.md.

A prova Moodle continua limitada ao laboratório fictício **localhost:3211,4.1.17 Build20250317**. A referência institucional4.1.17+/20250321, outros plugins/instâncias, contas reais e paridade completa não estão comprovados. Providers pagos usam HTTP simulado. Preferência real do sistema/GPU física e novos downloads pin4 não foram testados. Nenhum acesso ao Moodle IFCE ocorreu nesta revisão. Publicação/produção/licença não são aprovadas por este parecer.

Decisão quality: **pass** para `sha256:ad04237d5ef30724403d0dfc9ecc83b6e6ee00208fff7d5ec1ac2c41f89ed7e8`, com ponte de evidência e limitações explícitas. Nenhuma correção técnica solicitada.
