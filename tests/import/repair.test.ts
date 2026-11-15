// A garantia do JSON: o que a IA devolve só vira projeto se passar pela validação. Quando não passa, a resposta volta à
// IA com a lista do que está errado (até duas vezes); se continuar errada, o erro aparece e nada é aplicado.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { interpretText } from "../../src/server/import/index.ts";
import { repairRequest } from "../../src/server/import/providers.ts";
import { chatReply, chatRequest, type ChatRequest } from "./ai-fake.ts";

const text = await readFile(
  new URL("../fixtures/import/topics.txt", import.meta.url),
  "utf8",
);
const offline = await interpretText({
  text,
  profile: "docx-topicos-v1",
  provider: "offline",
});
assert.equal(offline.ok, true);
if (!offline.ok) throw new Error("Fixture inválida.");
const fields = offline.provenance.fields;
const good = JSON.stringify({ draft: offline.draft, fields });
const wrongVersion = JSON.stringify({
  draft: { ...offline.draft, schemaVersion: 99 },
  fields: [],
});
const input = {
  text,
  profile: "docx-topicos-v1",
  provider: "gemini",
  apiKey: "CHAVE-FICTICIA",
  model: "modelo-teste",
};
/** Uma IA que responde, em ordem, o que está na lista (a última se repete) e guarda os pedidos recebidos. */
function sequence(...replies: string[]) {
  const requests: ChatRequest[] = [];
  return {
    requests,
    fetch: (async (_url: unknown, options?: RequestInit) => {
      requests.push(chatRequest(options));
      return chatReply(replies[Math.min(requests.length, replies.length) - 1]!);
    }) as typeof fetch,
  };
}

test("JSON quebrado volta à IA com o que ela escreveu e o que está errado; a segunda resposta vale", async () => {
  const ai = sequence("{ isto não é json", good);
  const result = await interpretText(input, { fetch: ai.fetch });
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  assert.equal(ai.requests.length, 2);
  const retry = ai.requests[1]!.messages;
  assert.deepEqual(
    retry.map((message) => message.role),
    ["system", "user", "assistant", "user"],
  );
  // A IA vê a própria resposta e a lista do que está errado, e o documento original continua na conversa.
  assert.equal(retry[2]!.content, "{ isto não é json");
  assert.match(String(retry[3]!.content), /não é um JSON válido/);
  assert.equal(retry[1]!.content, ai.requests[0]!.messages[1]!.content);
});

test("o que o contrato recusa também volta à IA, com o caminho de cada problema", async () => {
  const ai = sequence(wrongVersion, good);
  const result = await interpretText(input, { fetch: ai.fetch });
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  assert.equal(ai.requests.length, 2);
  const asked = String(ai.requests[1]!.messages[3]!.content);
  assert.match(asked, /schemaVersion/);
  assert.equal(ai.requests[1]!.messages[2]!.content, wrongVersion);
});

test("origem inventada volta à IA, que corrige", async () => {
  const invented = JSON.stringify({
    draft: offline.draft,
    fields: [{ path: "metadata.fullName", sourceId: "imaginary", blockId: "x" }],
  });
  const ai = sequence(invented, good);
  const result = await interpretText(input, { fetch: ai.fetch });
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  assert.match(String(ai.requests[1]!.messages[3]!.content), /imaginary/);
});

test("depois de duas correções sem sucesso o erro aparece e nada é aplicado", async () => {
  const ai = sequence(wrongVersion);
  const result = await interpretText(input, { fetch: ai.fetch });
  assert.equal(ai.requests.length, 3, "a primeira resposta e duas correções");
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.path === "schemaVersion"));
  assert.equal(Object.hasOwn(result, "draft"), false);
});

test("a segunda tentativa que também falha por outro motivo ainda pode ser corrigida na terceira", async () => {
  const ai = sequence("{ quebrado", wrongVersion, good);
  const result = await interpretText(input, { fetch: ai.fetch });
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  assert.equal(ai.requests.length, 3);
});

test("erro de conexão, chave ou recusa não gasta correção", async () => {
  for (const reply of [
    () => new Response("", { status: 401 }),
    () => new Response("", { status: 429 }),
    () => new Response("", { status: 503 }),
    () => chatReply("", { refusal: "não posso" }),
    () => chatReply("{", { finishReason: "length" }),
  ]) {
    let calls = 0;
    const result = await interpretText(input, {
      fetch: async () => {
        calls++;
        return reply();
      },
    });
    assert.equal(result.ok, false);
    // 503 e 401 são HTTP; o Gemini aceita o modo JSON e 400/422 teriam uma segunda tentativa, mas estes não.
    assert.equal(calls, 1);
  }
});

test("o leitor sem IA não passa pelo laço de correção", async () => {
  const result = await interpretText({ ...input, provider: "offline", text: "nada que se reconheça" });
  assert.equal(result.ok, false);
});

test("uma resposta grande demais não volta inteira à IA", () => {
  assert.equal(repairRequest("x".repeat(400_001), ["problema"]), undefined);
  assert.deepEqual(repairRequest("{}", ["problema"]), {
    previous: "{}",
    problems: ["problema"],
  });
});

test("a chave não aparece nos pedidos de correção nem no resultado", async () => {
  const ai = sequence("{ quebrado", good);
  const result = await interpretText(input, { fetch: ai.fetch });
  assert.equal(JSON.stringify(ai.requests).includes("CHAVE-FICTICIA"), false);
  assert.equal(JSON.stringify(result).includes("CHAVE-FICTICIA"), false);
});

test("JSON quebrado volta à IA com a posição e o trecho do erro, para ela achar o colchete errado", async () => {
  // O erro de verdade do Gemini 3.5 Flash: a lista de seções fechada com "}" no lugar de "]".
  const broken = good.replace('],"attachments"', '},"attachments"');
  assert.notEqual(broken, good);
  assert.throws(() => JSON.parse(broken));
  const ai = sequence(broken, good);
  const result = await interpretText(input, { fetch: ai.fetch });
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  const asked = String(ai.requests[1]!.messages[3]!.content);
  assert.match(asked, /não é um JSON válido/);
  assert.match(asked, /posição \d+/);
  // O trecho vem da própria resposta da IA, em volta do ponto onde o leitor parou.
  const position = Number(/posição (\d+)/.exec(asked)![1]);
  // (o trecho é mostrado como texto JSON, com as aspas escapadas)
  assert.ok(asked.includes(JSON.stringify(broken.slice(position - 20, position)).slice(1, -1)), "o trecho antes do erro aparece");
  assert.match(asked, /\[|\]|\{|\}/);
  // O que a IA devolve de volta não passa de uma frase curta por problema.
  assert.ok(asked.length < 1500);
});

test("o texto que não tem nenhum JSON também recebe uma explicação, sem trecho", async () => {
  const ai = sequence("Desculpe, não consegui ler o documento.", good);
  const result = await interpretText(input, { fetch: ai.fetch });
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  assert.match(String(ai.requests[1]!.messages[3]!.content), /não é um JSON válido/);
});
