# FULL-01 — revisão independente de qualidade

Task / role / agent ID: FULL-01 / quality / `/root/contract_review_quality`.
Candidate revision: `sha256:98da4c329b360a5a3b78b4a08cf08d26ecb415ec543d35e6f9bfa464caa6f8c6`.
Base declarada: `645413365f4d0c8cec9bbc021c020a85a206f504`.
Result: **needs-fix**. Não há aprovação deste candidato.

## Integridade, independência e cobertura

Na checagem inicial, o SHA256 de JSON.stringify(candidate.files), UTF-8 sem LF final, coincidiu com a revisão acima. Os bytes/tamanhos e os SHA256 dos 164 arquivos coincidiram; o manifesto marca 149 como alterados. Os sete subconjuntos também tiveram digest correto e entradas idênticas às respectivas entradas globais:

| Scope de funcionalidade | Arquivos | Digest confirmado |
| --- | ---: | --- |
| platform | 42 | sha256:907aecd9d2ce5d5208d73dc48c3770420a59f05cbedd83c1433c58b34fe75233 |
| export | 13 | sha256:bf69b33e24fc2b67218d97bada62e7056d9fed1652f5adcc52032096d899206e |
| import | 22 | sha256:0f147e29de2731058e36b996c3bab5d421f03aa08697094cca5f2be9718c0706 |
| editor | 33 | sha256:87f74d7b36c18fb738fe97a0d9e33297b1670c3c986b618697a9e34371dac208 |
| students | 6 | sha256:ce1fb497ec52ba9fafb8d6a577925f559691a1d978b4506facbbde219980986a |
| dates | 3 | sha256:b9b72462ead3297091959cb55b6c36de2ba9966240108a016574fad26c814216 |
| operations | 30 | sha256:b742f15d3b495db3f5a09bae281a67199aa01c36f9628c4583f2db1806cb3cc1 |

Este mapeamento é por scope do manifesto, sem inferir nomes de branches Git. Não participei da implementação FULL-01, não usei narrativa dos executores ou o parecer de spec como justificativa e não alterei fontes/testes/records. A revisão segue AGENTS.md, FULL-01, OPS-01 e o papel quality da skill project-loop já lida. CodeGraph não está disponível; inspeção local. A única escrita desta revisão é este parecer.

## Achados que requerem correção

### Q1 — P1: requisição externa pode consumir chave de IA configurada no servidor

Scopes: **import / platform**. Localizações: app/api/interpret/route.ts:5–8; app/api/import/route.ts:21 em diante; src/server/import/providers.ts:178–192 (chave do ambiente).

/api/interpret lê qualquer corpo JSON sem conferir Origin nem Content-Type. POST com Origin https://outside.example e Content-Type text/plain é uma requisição simples que pode ser emitida por uma página externa. O adapter busca OPENAI_API_KEY/GEMINI_API_KEY no ambiente quando o payload não contém chave. Assim, a resposta pode ficar ilegível para a página devido a CORS, mas a chamada paga já foi iniciada. /api/import tem a mesma ausência de verificação de origem e aceita multipart, outro transporte simples entre origens.

Reprodução independente: chave fictícia colocada somente no processo da sondagem e fetch totalmente simulado; nenhuma rede/chave real foi usada. POST /api/interpret devolveu HTTP200, ok=true e providerCalls=1, sem apiKey no payload. A chave não vazou no retorno; o problema é autorização de consumo, não exposição textual. Pré-condição: chave do provedor configurada no ambiente; sem ela o adapter continua recusando a chamada.

Probe exato executável via `node --input-type=module` na raiz:

```js
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { interpretText } from './src/server/import/index.ts';
import { POST } from './app/api/interpret/route.ts';
const text = fs.readFileSync('tests/fixtures/import/topics.txt', 'utf8');
const offline = await interpretText({ text, profile: 'docx-topicos-v1', provider: 'offline' });
assert.equal(offline.ok, true);
const previousFetch = globalThis.fetch;
const previousKey = process.env.OPENAI_API_KEY;
let providerCalls = 0;
process.env.OPENAI_API_KEY = 'SYNTHETIC_REVIEW_KEY';
globalThis.fetch = async () => {
  providerCalls++;
  return Response.json({ status: 'completed', output: [{ content: [{ type: 'output_text',
    text: JSON.stringify({ draft: offline.draft, fields: offline.provenance.fields }) }] }] });
};
try {
  const response = await POST(new Request('http://127.0.0.1:3210/api/interpret', {
    method: 'POST', headers: { origin: 'https://outside.example', 'content-type': 'text/plain' },
    body: JSON.stringify({ text, profile: 'docx-topicos-v1', provider: 'openai' }),
  }));
  console.log({ status: response.status, ok: (await response.json()).ok, providerCalls });
} finally {
  globalThis.fetch = previousFetch;
  if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = previousKey;
}
// Observado: { status: 200, ok: true, providerCalls: 1 }
```

Correção solicitada: recusar origem externa antes de ler/chamar provedores em ambas as rotas; garantir que transporte JSON seja o esperado. Uma alternativa válida precisa impedir uso de credencial ambiente por entrada externa. Acrescentar regressões para POST simples text/plain e multipart com origem externa, confirmando zero chamadas ao provider.

### Q2 — P2: fingerprint de datas descarta valores de campos repetidos

Scopes: **operations / dates**. Localização: src/server/moodle/dates.ts:57–65, especialmente Object.fromEntries em :59; consumidores em readTarget e confirmDates.

readForm preserva corretamente pares ordenados e selects múltiplos, mas semantic() os reduz a um objeto, conservando somente o último valor de cada nome. Isso afeta a detecção de deriva antes do POST e a conferência depois dele. Contraria OPS-01: recusar deriva, preservar todos os outros campos e verificar o estado efetivo antes de declarar applied.

Duas sondagens públicas confirmaram a falha usando MoodleClient com fetch simulado e a fixture existente, sem rede real:

- Depois da prévia, tags[] mudou de ['original','fixed'] para ['changed','fixed']. confirmDates fez 3 POSTs e devolveu 3 applied, sem recusar a deriva.
- A prévia/leitura anterior ao envio tinha tags[]=['first','last']; o transporte simulado devolveu apenas ['last'] após o POST. confirmDates novamente declarou 3 applied, partial=false. A releitura perdeu o primeiro valor de todos os alvos, mas a conferência não identificou a perda.

Probe da perda na releitura, executável via stdin:

```js
import { MoodleClient } from './src/server/moodle/client.ts';
import { previewDates, confirmDates } from './src/server/moodle/dates.ts';
import { dateFixture, dateInput } from './tests/moodle/fixtures.ts';
const fixture = dateFixture();
const tags = new Map(['2','4','5'].map(id => [id, ['first','last']]));
let posted = 0;
const client = new MoodleClient('http://localhost:3211', { fetch: async (url, init) => {
  const address = new URL(String(url));
  const pairs = new URLSearchParams(String(init?.body));
  const id = address.searchParams.get('id') ?? address.searchParams.get('update') ?? pairs.get('id');
  if (init?.method === 'POST') { posted++; tags.set(id, pairs.getAll('tags[]').slice(-1)); }
  const response = await fixture.fetch(url, init);
  let html = await response.text();
  if (id && html.includes('<form')) html = html.replace(/<input name='tags\[\]'[^>]*>/g, '')
    .replace('</form>', `<select name='tags[]' multiple>${(tags.get(id) ?? []).map(tag =>
      `<option selected value='${tag}'>${tag}</option>`).join('')}</select></form>`);
  return new Response(html, { status: response.status });
}});
const preview = await previewDates(client, 3, dateInput);
const result = await confirmDates(client, preview.operation);
console.log({ posted, counts: result.counts, tagsAfter: Object.fromEntries(tags) });
// Observado: posted=3; applied=3; cada alvo tem somente ['last'].
```

Correção solicitada: representação semântica que preserve todos os valores/ordem necessários dos campos repetidos, sem perder a normalização dos IDs voláteis já documentados. Regredir tanto mudança anterior à confirmação quanto perda/divergência posterior ao envio; o segundo caso deve ser unknown e interromper alvos posteriores.

### Q3 — P2: save valida um objeto e pode persistir outro conteúdo após await

Scopes: **editor / platform** (persistência F3). Localização: src/client/project-store.ts:24–50.

save valida project antes de aguardar a abertura do banco e de aguardar store.get, mas usa o objeto vivo em id/revision/comparação e só o clona no store.put. Se o chamador modifica o argumento enquanto save está pendente, a transação pode substituir a cópia válida anterior por um projeto inválido sem sinalizar erro. A UI atual clona um snapshot antes de chamar save (app/page.tsx:231 em diante), portanto a sondagem demonstra a falha na fronteira pública do armazenamento, não uma interação UI já observada.

Probe exato, somente fake-indexeddb em memória:

```js
import { IDBFactory } from 'fake-indexeddb';
import { ProjectStore } from './src/client/project-store.ts';
import { createProject } from './src/client/project.ts';
const store = new ProjectStore(new IDBFactory(), 'review-memory-existing');
const original = createProject('Curso fictício');
await store.save(original, null);
const next = structuredClone(original);
next.draft.revision++;
const pending = store.save(next, original.draft.revision);
next.draft.attachments.push({ id: 'missing', name: 'missing.txt', size: 1, mediaType: 'text/plain' });
await pending; // Resolve, embora o argumento já tenha se tornado inválido.
try { await store.load(original.draft.id); }
catch (error) { console.log(error.message); }
await store.close();
// Observado: O projeto salvo contém dados inválidos. Importe uma cópia portátil.
```

Correção solicitada: clonar imediatamente no início de save e validar/usar exclusivamente esse snapshot em todos os passos. O teste deve comprovar que mudanças posteriores no argumento não mudam o conteúdo da transação nem corrompem a versão anterior.

## Verificação e avaliação dos sete scopes

Execução independente: `node --test --test-reporter=dot tests/domain/*.test.ts tests/shared/*.test.ts tests/export/*.test.ts tests/import/*.test.ts tests/client/*.test.ts tests/students/*.test.ts tests/dates/*.test.ts tests/moodle/*.test.ts`, saída 0, **206 testes aprovados**, sem os testes CLI que criam temporários. As sondagens acima não editaram produto/testes nem acessaram serviço real. Os testes atuais passam, mas não cobrem os três casos identificados.

Gate registrado inspecionado: docs/tasks/FULL-01/check.log contém typecheck, lint sem warnings, 215 testes aprovados e build Next/CLI; check.exit.json informa saída0. clean-install.exit.json registra npm ci --ignore-scripts --offline saída0. Esses JSON ainda não incluíam revision ao serem lidos; a associação formal ao candidato e o browser.md são responsabilidade do orquestrador. Não se concede pass por presença de arquivo.

| Scope | Avaliação de qualidade e evidência |
| --- | --- |
| platform | Corpos reais limitados, UTF-8/JSON controlados, ZIP verificado antes e durante inflação, CRC/paths/quantidade/tamanhos controlados. Configuração/dependências e ferramentas CLI/design permanecem documentadas. Q1 envolve a fronteira HTTP; Q3 envolve integridade da persistência. |
| export | Contrato revalidado, bytes clonados/resolvidos por ID, erro localizado para bytes ausentes/divergentes e nomes duplicados no mesmo destino, XML/HTML escapados, limites de arquivo/total/pacote, cancelamento durante resolver e modelo isolado por chamada. Testes públicos verificam pacote, referências, seis/nove atividades, três questões, conteúdo rico, notas/datas, erros e concorrência. Nenhum bloqueio adicional encontrado na inspeção. |
| import | DOCX usa parser de dados, rejeita DOCTYPE/ENTITY e imagens externas; mídia tem ID separado das ocorrências. Offline é delimitado e não inventa configurações ausentes; IA compartilha validação e confere origem/ocorrências/anexos, sem fallback oculto. ZIP/texto/PDF/provider são limitados; falhas não publicam draft inválido. Q1 bloqueia a entrada HTTP com credenciais ambientes. |
| editor | Comandos por ID e expectedRevision, revisão invalidada após edição, conteúdo React textual e imagens de MIME permitido, portátil com manifesto estrito/hashes e troca somente após validação. IndexedDB usa readwrite e revisão esperada; testes de duas abas passam. Proveniência persistida e origem por ID foram inspecionadas/testadas. Q3 requer snapshot próprio do store. UI foi inspecionada em fonte; não executei revisão visual independente nesta rodada. |
| students | CSV/XLS/XLSX com limites, mapeamento explícito, valores originais/IDs mantidos, validação de duplicados/CPF/e-mail e bloqueio de fórmulas, preview/hash. UI invalida prévias com generation e confirma por ação explícita; não há envio em montagem. Nenhum bloqueio adicional encontrado. |
| dates | Modelo próprio, revisão/hash, timezone explícito, before/after e preservação de condições não relacionadas a datas. UI invalida prévia e recusa resultado calculado incompatível. Q2 está na conferência do adapter, consumido por este fluxo. |
| operations | Somente URL configurada localhost:3211; nenhuma URL cliente. Sessões opacas/TTL/limites, same-origin obrigatório para mutações, cookie httpOnly, confirmação consumida antes do await, lock, erro incerto após envio, HTTP com deadline/resposta limitada/redirect same-origin/cookies privados. Defaults e matrícula student são expostos/conferidos; sem envio automático. Q2 permite applied indevido em formulário com múltiplos valores. |

## Limites da conclusão

Foram inspecionados docs/lab/evidence.json, complete-evidence.json e tests/moodle/lab-evidence.json/lab-database-evidence.json: registram restauração, snapshots e operações com contas/cursos fictícios exclusivamente no Moodle local 4.1.17 Build20250317. Não repeti mutações no laboratório nem confirmei ambiente externo. Não usei/acesso o Moodle IFCE. Evidência local não comprova outras versões/plugins, nem chamadas pagas aos provedores; essa distinção também aparece em README/perfis. A revisão é de fronteiras/riscos/testes das sete funcionalidades, não uma alegação de leitura linha a linha de todos os164 arquivos.

Corrigir Q1/Q2/Q3, capturar novo digest e repetir os checks/testes afetados antes de nova revisão independente. O parecer e as sondagens se aplicam somente ao pin acima; não aprovam candidato posterior ou merge.

Conferência final após a escrita deste parecer: o digest do manifesto continua o mesmo, mas tests/client/project.test.ts já difere de seu SHA256 congelado; todos os outros163 arquivos ainda coincidem. A checagem inicial e a execução de206 testes antecederam essa alteração, comunicada ao orquestrador. As correções iniciadas exigem outro manifesto/check/revisão; este relatório não afirma integridade atual da cópia em mutação.
