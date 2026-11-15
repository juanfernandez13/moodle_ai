// O "Testar" da janela da IA: uma chamada mínima pelo mesmo caminho da importação, explicada em português simples.
import assert from "node:assert/strict";
import test from "node:test";
import { POST as testPost } from "../../app/api/import/test/route.ts";
import {
  explainFailure,
  testConnection,
} from "../../src/server/import/connection-test.ts";
import {
  AI_PRESETS,
  AI_PROVIDER_IDS,
  type AiProviderId,
} from "../../src/shared/ai-providers.ts";
import { chatReply, chatRequest } from "./ai-fake.ts";

const KEY = "SYNTHETIC-TEST-KEY-8Q2LZ7MWX4";
const CUSTOM_URL = "https://ia.exemplo.com/v1";
const input = (provider: AiProviderId) => ({
  apiKey: KEY,
  model: "modelo-teste",
  ...(provider === "custom" ? { baseUrl: CUSTOM_URL } : {}),
});
const expectedUrl = (provider: AiProviderId) =>
  `${AI_PRESETS[provider].baseUrl ?? CUSTOM_URL}/chat/completions`;

for (const provider of AI_PROVIDER_IDS)
  test(`${provider}: o teste é uma chamada mínima pelo mesmo endereço, com a chave só no header`, async () => {
    const preset = AI_PRESETS[provider];
    let calls = 0;
    const result = await testConnection(provider, {
      ...input(provider),
      fetch: async (url, options) => {
        calls++;
        assert.equal(String(url), expectedUrl(provider));
        assert.equal(
          new Headers(options?.headers).get("authorization"),
          `Bearer ${KEY}`,
        );
        assert.equal(String(options?.body).includes(KEY), false);
        assert.equal(options?.redirect, "error");
        const body = chatRequest(options);
        assert.equal(body.model, "modelo-teste");
        assert.equal(body[preset.tokenParam], 256);
        // Sem modo JSON e sem prompt de importação: é só "responda ok".
        assert.equal(body.response_format, undefined);
        assert.deepEqual(
          body.messages.map((message) => message.role),
          ["user"],
        );
        return chatReply("ok");
      },
    });
    assert.equal(calls, 1);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.model, "modelo-teste");
      assert.equal(result.reply, "ok");
      assert.ok(result.ms >= 0);
    }
    assert.equal(JSON.stringify(result).includes(KEY), false);
  });

test("um 200 já basta: resposta vazia, cortada ou estranha não reprova o teste", async () => {
  for (const reply of [
    () => chatReply("", { finishReason: "length" }),
    () => new Response("não é json", { status: 200 }),
    () => Response.json({ choices: [] }),
  ]) {
    const result = await testConnection("gemini", {
      ...input("gemini"),
      fetch: async () => reply(),
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.reply, "");
  }
});

test("cada falha vira uma frase simples, com o que fazer, e nada do que o serviço disse volta", async () => {
  const cases: [number, string, string][] = [
    [401, "", "auth"],
    // O Gemini responde 400 (e não 401) a uma chave que não vale.
    [400, '{"error":{"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT"}}', "auth"],
    [403, '{"error":{"message":"The API key is invalid"}}', "auth"],
    [403, '{"error":{"message":"permission denied"}}', "permission"],
    [402, "", "credit"],
    [404, '{"error":{"message":"models/xyz is not found"}}', "model"],
    [429, '{"error":{"message":"quota exceeded"}}', "limit"],
    [500, "", "down"],
    [503, "", "down"],
    [400, '{"error":{"message":"The model `x` does not exist"}}', "model"],
    [400, "bad request", "rejected"],
    [422, "unprocessable", "rejected"],
  ];
  for (const [status, text, code] of cases) {
    const result = await testConnection("openai", {
      ...input("openai"),
      fetch: async () =>
        new Response(`${text} SECRET-DOCUMENT ${KEY}`, { status }),
    });
    assert.equal(result.ok, false, `${status} ${text}`);
    if (result.ok) return;
    assert.equal(result.code, code, `${status} ${text}`);
    assert.ok(result.message.length > 10 && result.message.endsWith("."), result.message);
    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes("SECRET-DOCUMENT"), false);
    assert.equal(serialized.includes(KEY), false);
  }
  assert.equal(explainFailure(401, "").code, "auth");
});

test("sem chave, sem modelo ou com endereço inválido, o teste diz o que falta e não chama o serviço", async (context) => {
  const names = ["CUSTOM_AI_API_KEY", "CUSTOM_AI_MODEL", "CUSTOM_AI_BASE_URL", "GEMINI_API_KEY"];
  const previous = names.map((name) => process.env[name]);
  context.after(() =>
    names.forEach((name, index) => {
      const value = previous[index];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }),
  );
  for (const name of names) delete process.env[name];
  const never = {
    fetch: async (): Promise<Response> => {
      throw new Error("Não deveria chamar.");
    },
  };
  const noKey = await testConnection("gemini", { model: "x", ...never });
  assert.deepEqual(noKey, {
    ok: false,
    code: "provider_unconfigured",
    message: "Cole a chave primeiro.",
  });
  const noModel = await testConnection("custom", { apiKey: KEY, baseUrl: CUSTOM_URL, ...never });
  assert.equal(noModel.ok === false && noModel.code, "invalid_model");
  const noUrl = await testConnection("custom", { apiKey: KEY, model: "m", ...never });
  assert.equal(noUrl.ok === false && noUrl.code, "invalid_base_url");
  const badUrl = await testConnection("custom", { apiKey: KEY, model: "m", baseUrl: "http://ia.exemplo.com/v1", ...never });
  assert.equal(badUrl.ok === false && badUrl.code, "invalid_base_url");
  // O Gemini usa o modelo padrão (3.5 Flash) quando a pessoa não escolhe outro.
  let used = "";
  await testConnection("gemini", {
    apiKey: KEY,
    fetch: async (_url, options) => {
      used = chatRequest(options).model;
      return chatReply("ok");
    },
  });
  assert.equal(used, "gemini-3.5-flash");
});

test("rede, prazo e cancelamento têm frase própria", async () => {
  const offline = await testConnection("gemini", {
    ...input("gemini"),
    fetch: async () => {
      throw new Error(`falha com ${KEY}`);
    },
  });
  assert.equal(offline.ok === false && offline.code, "network");
  assert.equal(JSON.stringify(offline).includes(KEY), false);
  const slow = await testConnection("gemini", {
    ...input("gemini"),
    timeoutMs: 5,
    fetch: (async (_url: unknown, options?: RequestInit) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener("abort", () => reject(new Error("abortado")), { once: true });
      })) as typeof fetch,
  });
  assert.equal(slow.ok === false && slow.code, "timeout");
  const controller = new AbortController();
  controller.abort();
  const cancelled = await testConnection("gemini", {
    ...input("gemini"),
    signal: controller.signal,
    fetch: async () => {
      throw new Error("Não deveria chamar.");
    },
  });
  assert.equal(cancelled.ok === false && cancelled.code, "cancelled");
});

const post = (body: unknown, headers: Record<string, string> = {}) =>
  testPost(
    new Request("http://localhost/api/import/test", {
      method: "POST",
      headers: {
        origin: "http://localhost",
        "content-type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    }),
  );

test("a rota responde 200 com o resultado do teste, inclusive quando a chave não vale", async (context) => {
  context.mock.method(globalThis, "fetch", async (_url: unknown, options: RequestInit) =>
    new Headers(options.headers).get("authorization") === `Bearer ${KEY}`
      ? chatReply("ok")
      : new Response("", { status: 401 }),
  );
  const good = await post({ provider: "gemini", apiKey: KEY });
  assert.equal(good.status, 200);
  assert.equal(good.headers.get("cache-control"), "no-store");
  const goodBody = await good.json();
  assert.equal(goodBody.ok, true);
  assert.equal(goodBody.model, "gemini-3.5-flash");
  const bad = await post({ provider: "gemini", apiKey: "outra-chave" });
  assert.equal(bad.status, 200);
  const badBody = await bad.json();
  assert.equal(badBody.ok, false);
  assert.equal(badBody.code, "auth");
  assert.equal(JSON.stringify([goodBody, badBody]).includes(KEY), false);
});

test("a rota recusa outra origem, outro formato, campo desconhecido e endereço em IA que já tem o seu", async (context) => {
  let calls = 0;
  context.mock.method(globalThis, "fetch", async () => {
    calls++;
    return chatReply("ok");
  });
  assert.equal((await post({ provider: "gemini", apiKey: KEY }, { origin: "https://outside.example" })).status, 403);
  assert.equal((await post({ provider: "gemini", apiKey: KEY }, { "content-type": "text/plain" })).status, 415);
  assert.equal((await post({ provider: "gemini", apiKey: KEY, extra: 1 })).status, 400);
  assert.equal((await post({ provider: "offline", apiKey: KEY })).status, 400);
  const misplaced = await post({ provider: "openai", apiKey: KEY, baseUrl: CUSTOM_URL });
  assert.equal(misplaced.status, 400);
  assert.equal((await misplaced.json()).issues[0].path, "baseUrl");
  assert.equal(calls, 0, "nenhuma dessas recusas chega ao serviço");
});
