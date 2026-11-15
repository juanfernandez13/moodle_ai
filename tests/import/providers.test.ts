import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  importDocuments,
  interpretText,
} from "../../src/server/import/index.ts";
import { extractJson } from "../../src/server/import/providers.ts";
import {
  AI_PRESETS,
  AI_PROVIDER_IDS,
  type AiProviderId,
} from "../../src/shared/ai-providers.ts";
import { chatReply, chatRequest } from "./ai-fake.ts";

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
const envelope = JSON.stringify({
  draft: offline.draft,
  fields: offline.provenance.fields,
});
const CUSTOM_URL = "https://ia.exemplo.com/v1";
const request = (provider: AiProviderId) => ({
  text,
  profile: "docx-topicos-v1",
  provider,
  apiKey: "MEMORY-SECRET",
  model: "test-model",
  ...(provider === "custom" ? { baseUrl: CUSTOM_URL } : {}),
});
const expectedUrl = (provider: AiProviderId) =>
  `${AI_PRESETS[provider].baseUrl ?? CUSTOM_URL}/chat/completions`;

for (const provider of AI_PROVIDER_IDS) {
  const preset = AI_PRESETS[provider];
  test(`${provider}: mesmo formato chat/completions, chave só no header`, async () => {
    let calls = 0;
    const result = await interpretText(request(provider), {
      fetch: async (url, options) => {
        calls++;
        assert.equal(String(url), expectedUrl(provider));
        assert.equal(String(url).includes("MEMORY-SECRET"), false);
        assert.equal(String(options?.body).includes("MEMORY-SECRET"), false);
        assert.equal(
          new Headers(options?.headers).get("authorization"),
          "Bearer MEMORY-SECRET",
        );
        assert.equal(options?.redirect, "error");
        const body = chatRequest(options);
        assert.equal(body.model, "test-model");
        // O nome do parâmetro do limite de saída muda de um serviço para outro; só o da predefinição vai.
        const other =
          preset.tokenParam === "max_tokens"
            ? "max_completion_tokens"
            : "max_tokens";
        assert.equal(body[preset.tokenParam], 32_000);
        assert.equal(body[other], undefined);
        // O Claude no formato compatível recusa json_object (só aceita json_schema estrito): ele não recebe o pedido.
        assert.equal(
          body.response_format?.type,
          preset.jsonMode === "json_object" ? "json_object" : undefined,
        );
        assert.deepEqual(
          body.messages.map((message) => message.role),
          ["system", "user"],
        );
        return chatReply(envelope);
      },
    });
    assert.equal(calls, 1);
    assert.equal(result.ok, true, JSON.stringify(result.issues));
    if (result.ok) {
      assert.deepEqual(result.draft, offline.draft);
      assert.equal(result.provenance.provider, provider);
      assert.equal(result.provenance.model, "test-model");
    }
    assert.equal(JSON.stringify(result).includes("MEMORY-SECRET"), false);
  });

  test(`${provider}: resposta parseável ainda precisa do domínio e da origem`, async () => {
    const bad = await interpretText(request(provider), {
      fetch: async () =>
        chatReply(
          JSON.stringify({
            draft: { ...offline.draft, schemaVersion: 99 },
            fields: [],
          }),
        ),
    });
    assert.equal(bad.ok, false);
    assert.ok(bad.issues.some((issue) => issue.path === "schemaVersion"));
    const invented = await interpretText(request(provider), {
      fetch: async () =>
        chatReply(
          JSON.stringify({
            draft: offline.draft,
            fields: [
              {
                path: "metadata.fullName",
                sourceId: "imaginary",
                blockId: "invented",
              },
            ],
          }),
        ),
    });
    assert.equal(invented.ok, false);
    assert.ok(
      invented.issues.some(
        (issue) => issue.code === "provider_invalid_provenance",
      ),
    );
    const malformed = await interpretText(request(provider), {
      fetch: async () => chatReply("{bad"),
    });
    assert.equal(malformed.ok, false);
    assert.ok(
      malformed.issues.some((issue) => issue.code === "provider_invalid_json"),
    );
  });

  test(`${provider}: erros HTTP são sanitizados`, async () => {
    for (const [status, code] of [
      [401, "provider_authentication"],
      [429, "provider_rate_limit"],
      [503, "provider_unavailable"],
      [400, "provider_request_rejected"],
    ] as const) {
      let calls = 0;
      const result = await interpretText(request(provider), {
        fetch: async () => {
          calls++;
          return new Response("MEMORY-SECRET / secret document", { status });
        },
      });
      // 400 e 422 de quem aceita o modo JSON ganham uma segunda tentativa sem ele; o resto não repete.
      assert.equal(
        calls,
        status === 400 && preset.jsonMode === "json_object" ? 2 : 1,
        `${provider} ${status}`,
      );
      assert.equal(result.ok, false);
      assert.ok(result.issues.some((issue) => issue.code === code));
      assert.equal(JSON.stringify(result).includes("MEMORY-SECRET"), false);
    }
  });
}

test("recusa, truncamento e resposta vazia são controlados", async () => {
  for (const [reply, code] of [
    [() => chatReply("", { refusal: "SECRET" }), "provider_refusal"],
    [() => chatReply("x", { finishReason: "content_filter" }), "provider_refusal"],
    [() => chatReply("{", { finishReason: "length" }), "provider_incomplete"],
    [() => Response.json({ choices: [] }), "provider_empty_response"],
    [() => chatReply("   "), "provider_empty_response"],
    [
      () => Response.json({ choices: [{ message: { content: { x: 1 } } }] }),
      "provider_invalid_response",
    ],
  ] as const) {
    const result = await interpretText(request("openai"), {
      fetch: async () => reply(),
    });
    assert.equal(result.ok, false, code);
    assert.ok(
      result.issues.some((issue) => issue.code === code),
      `${code}: ${JSON.stringify(result.issues)}`,
    );
    assert.equal(JSON.stringify(result.issues).includes("SECRET"), false);
  }
});

test("conteúdo em partes de texto também vale", async () => {
  const result = await interpretText(request("custom"), {
    fetch: async () =>
      Response.json({
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: [
                { type: "text", text: envelope.slice(0, 40) },
                { type: "text", text: envelope.slice(40) },
              ],
            },
          },
        ],
      }),
  });
  assert.equal(result.ok, true, JSON.stringify(result.issues));
});

test("cancelamento e prazo encerrado preservam diagnóstico sem conteúdo bruto", async () => {
  const controller = new AbortController();
  controller.abort();
  const cancelled = await interpretText(request("openai"), {
    signal: controller.signal,
    fetch: async () => {
      throw new Error("Não deveria chamar.");
    },
  });
  assert.equal(cancelled.ok, false);
  assert.ok(cancelled.issues.some((issue) => issue.code === "cancelled"));
  const result = await interpretText(request("openai"), {
    timeoutMs: 5,
    fetch: async (_url, options) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener(
          "abort",
          () => reject(new Error("SECRET")),
          { once: true },
        );
      }),
  });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.code === "provider_timeout"));
});

test("modelo em branco no ambiente do servidor vale como sem modelo", async (context) => {
  // A tela lê o mesmo ambiente (GET /api/import/providers) e diz que vale o modelo padrão.
  const names = AI_PROVIDER_IDS.map((id) => AI_PRESETS[id].modelVariable);
  const previous = names.map((name) => process.env[name]);
  context.after(() =>
    names.forEach((name, index) => {
      const value = previous[index];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }),
  );
  for (const blank of ["", "   ", " \t"]) {
    for (const name of names) process.env[name] = blank;
    for (const provider of ["openai", "gemini", "claude"] as const) {
      let used = "";
      const result = await interpretText(
        { ...request(provider), model: undefined },
        {
          fetch: async (_url, options) => {
            used = chatRequest(options).model;
            return chatReply(envelope);
          },
        },
      );
      assert.equal(result.ok, true, JSON.stringify(result.issues));
      assert.equal(used, AI_PRESETS[provider].defaultModel);
    }
  }
  process.env.OPENAI_MODEL = "  modelo-do-servidor ";
  let used = "";
  await interpretText(
    { ...request("openai"), model: undefined },
    {
      fetch: async (_url, options) => {
        used = chatRequest(options).model;
        return chatReply(envelope);
      },
    },
  );
  assert.equal(used, "modelo-do-servidor");
});

test("origem de um campo inexistente é rejeitada mesmo quando o bloco existe", async () => {
  const fields = [
    { ...offline.provenance.fields[0]!, path: "metadata.nonexistent" },
  ];
  const result = await interpretText(request("openai"), {
    fetch: async () =>
      chatReply(JSON.stringify({ draft: offline.draft, fields })),
  });
  assert.equal(result.ok, false);
  assert.ok(
    result.issues.some((issue) => issue.code === "provider_invalid_provenance"),
  );
});

test("o modelo que embrulha o JSON em markdown ou em uma frase ainda é aceito", async () => {
  for (const wrapped of [
    "```json\n" + envelope + "\n```",
    "```\n" + envelope + "\n```",
    "Aqui está o resultado:\n" + envelope + "\nEspero ter ajudado!",
  ]) {
    let calls = 0;
    const result = await interpretText(request("claude"), {
      fetch: async () => {
        calls++;
        return chatReply(wrapped);
      },
    });
    assert.equal(result.ok, true, wrapped.slice(0, 30));
    assert.equal(calls, 1, "extrair o JSON não gasta uma nova chamada");
  }
});

test("extractJson tira só o que embrulha o JSON", () => {
  assert.equal(extractJson('{"a":1}'), '{"a":1}');
  assert.equal(extractJson('  \n{"a":1}\n '), '{"a":1}');
  assert.equal(extractJson('```json\n{"a":1}\n```'), '{"a":1}');
  assert.equal(extractJson('```JSON\r\n{"a":1}\r\n```'), '{"a":1}');
  assert.equal(extractJson('Segue: {"a":{"b":2}} fim'), '{"a":{"b":2}}');
  assert.equal(extractJson("sem json"), "sem json");
  assert.equal(extractJson('﻿{"a":1}'), '{"a":1}');
});

test("serviço que recusa o modo JSON recebe uma segunda tentativa sem ele", async () => {
  const sent: (string | undefined)[] = [];
  const result = await interpretText(request("custom"), {
    fetch: async (_url, options) => {
      const body = chatRequest(options);
      sent.push(body.response_format?.type);
      return body.response_format
        ? new Response("response_format unsupported", { status: 400 })
        : chatReply(envelope);
    },
  });
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  assert.deepEqual(sent, ["json_object", undefined]);
});

test("as imagens do documento vão como partes image_url, com o texto", async () => {
  const docx = new Uint8Array(
    await readFile(
      new URL("../fixtures/import/topicos-com-imagens.docx", import.meta.url),
    ),
  );
  const input = {
    files: [
      {
        id: "source-1",
        name: "topicos-com-imagens.docx",
        mediaType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        bytes: docx,
      },
    ],
    profile: "docx-topicos-v1",
  };
  const local = await importDocuments({ ...input, provider: "offline" });
  assert.equal(local.ok, true, JSON.stringify(local));
  if (!local.ok) return;
  assert.ok(local.assets.length > 0, "a fixture tem imagens");
  let user: unknown;
  const result = await importDocuments(
    { ...input, provider: "claude", apiKey: "MEMORY-SECRET" },
    {
      fetch: async (_url, options) => {
        user = chatRequest(options).messages[1]!.content;
        return chatReply(
          JSON.stringify({
            draft: local.draft,
            fields: local.provenance.fields,
          }),
        );
      },
    },
  );
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  assert.ok(Array.isArray(user));
  const parts = user as { type: string; image_url?: { url: string } }[];
  assert.equal(parts[0]!.type, "text");
  const images = parts.slice(1);
  assert.equal(images.length, local.assets.length);
  for (const part of images) {
    assert.equal(part.type, "image_url");
    assert.match(part.image_url!.url, /^data:image\/[a-z.+-]+;base64,/);
  }
});

test("o endereço só vale para a Outra IA", async () => {
  for (const provider of ["openai", "gemini", "claude"] as const) {
    const result = await interpretText(
      { ...request(provider), baseUrl: "https://ia.exemplo.com/v1" },
      {
        fetch: async () => {
          throw new Error("Não deveria chamar.");
        },
      },
    );
    assert.equal(result.ok, false, provider);
    assert.ok(result.issues.some((issue) => issue.path === "baseUrl"));
  }
});

test("a Outra IA pede modelo e endereço, e confere o endereço digitado", async (context) => {
  const names = ["CUSTOM_AI_API_KEY", "CUSTOM_AI_MODEL", "CUSTOM_AI_BASE_URL"];
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
    fetch: async () => {
      throw new Error("Não deveria chamar.");
    },
  };
  const noModel = await interpretText(
    { ...request("custom"), model: undefined },
    never,
  );
  assert.ok(noModel.issues.some((issue) => issue.code === "invalid_model"));
  const noUrl = await interpretText(
    { ...request("custom"), baseUrl: undefined },
    never,
  );
  assert.ok(noUrl.issues.some((issue) => issue.code === "invalid_base_url"));
  for (const bad of [
    "ftp://ia.exemplo.com/v1",
    "http://ia.exemplo.com/v1",
    "https://usuario:senha@ia.exemplo.com/v1",
    "https://ia.exemplo.com/v1?chave=1",
    "isto não é um endereço",
  ]) {
    const result = await interpretText(
      { ...request("custom"), baseUrl: bad },
      never,
    );
    assert.ok(
      result.issues.some((issue) => issue.code === "invalid_base_url"),
      bad,
    );
  }
});

test("a Outra IA usa a chave, o modelo e o endereço do servidor quando a tela não manda", async (context) => {
  const names = ["CUSTOM_AI_API_KEY", "CUSTOM_AI_MODEL", "CUSTOM_AI_BASE_URL"];
  const previous = names.map((name) => process.env[name]);
  context.after(() =>
    names.forEach((name, index) => {
      const value = previous[index];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }),
  );
  process.env.CUSTOM_AI_API_KEY = "CHAVE-DO-SERVIDOR";
  process.env.CUSTOM_AI_MODEL = "llama3.2:3b";
  // Quem escreve o ambiente administra o servidor: este endereço (aqui, uma máquina local) vale sem conferência.
  process.env.CUSTOM_AI_BASE_URL = "http://127.0.0.1:11434/v1/";
  let seen: { url: string; auth: string | null; model: string } | null = null;
  const result = await interpretText(
    { text, profile: "docx-topicos-v1", provider: "custom" },
    {
      fetch: async (url, options) => {
        seen = {
          url: String(url),
          auth: new Headers(options?.headers).get("authorization"),
          model: chatRequest(options).model,
        };
        return chatReply(envelope);
      },
    },
  );
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  assert.deepEqual(seen, {
    url: "http://127.0.0.1:11434/v1/chat/completions",
    auth: "Bearer CHAVE-DO-SERVIDOR",
    model: "llama3.2:3b",
  });
});
