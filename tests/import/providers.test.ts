import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  interpretText,
  type ImportProvider,
} from "../../src/server/import/index.ts";

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
const request = (provider: ImportProvider) => ({
  text,
  profile: "docx-topicos-v1",
  provider,
  apiKey: "MEMORY-SECRET",
  model: "test-model",
});
const response = (provider: ImportProvider, value = envelope): Response =>
  Response.json(
    provider === "openai"
      ? {
          status: "completed",
          output: [
            {
              type: "message",
              content: [{ type: "output_text", text: value }],
            },
          ],
        }
      : {
          candidates: [
            { finishReason: "STOP", content: { parts: [{ text: value }] } },
          ],
        },
  );

for (const provider of ["openai", "gemini"] as const) {
  test(`${provider}: transporte simulado, mesmo contrato e credencial somente no header`, async () => {
    let calls = 0;
    const result = await interpretText(request(provider), {
      fetch: async (url, options) => {
        calls++;
        assert.ok(
          String(url).startsWith(
            provider === "openai"
              ? "https://api.openai.com/"
              : "https://generativelanguage.googleapis.com/",
          ),
        );
        assert.equal(String(url).includes("MEMORY-SECRET"), false);
        assert.equal(String(options?.body).includes("MEMORY-SECRET"), false);
        assert.equal(
          new Headers(options?.headers).get(
            provider === "openai" ? "authorization" : "x-goog-api-key",
          ),
          provider === "openai" ? "Bearer MEMORY-SECRET" : "MEMORY-SECRET",
        );
        assert.equal(
          JSON.parse(String(options?.body)).model ?? "test-model",
          "test-model",
        );
        return response(provider);
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
        response(
          provider,
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
        response(
          provider,
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
      fetch: async () => response(provider, "{bad"),
    });
    assert.equal(malformed.ok, false);
    assert.ok(
      malformed.issues.some((issue) => issue.code === "provider_invalid_json"),
    );
  });

  test(`${provider}: erros HTTP são sanitizados e não fazem nova chamada ou fallback`, async () => {
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
      assert.equal(calls, 1);
      assert.equal(result.ok, false);
      assert.ok(result.issues.some((issue) => issue.code === code));
      assert.equal(JSON.stringify(result).includes("MEMORY-SECRET"), false);
    }
  });
}

test("recusa, truncamento e resposta vazia dos dois providers são controlados", async () => {
  for (const [provider, body, code] of [
    [
      "openai",
      {
        status: "completed",
        output: [{ content: [{ type: "refusal", refusal: "SECRET" }] }],
      },
      "provider_refusal",
    ],
    [
      "openai",
      {
        status: "incomplete",
        incomplete_details: { reason: "max_output_tokens" },
      },
      "provider_incomplete",
    ],
    ["openai", { status: "completed", output: [] }, "provider_empty_response"],
    [
      "gemini",
      { promptFeedback: { blockReason: "SAFETY" } },
      "provider_refusal",
    ],
    [
      "gemini",
      { candidates: [{ finishReason: "MAX_TOKENS" }] },
      "provider_incomplete",
    ],
    ["gemini", { candidates: [] }, "provider_empty_response"],
  ] as const) {
    const result = await interpretText(request(provider), {
      fetch: async () => Response.json(body),
    });
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((issue) => issue.code === code));
    assert.equal(JSON.stringify(result.issues).includes("SECRET"), false);
  }
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
  const names = ["OPENAI_MODEL", "GEMINI_MODEL"] as const;
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
    for (const provider of ["openai", "gemini"] as const) {
      let used = "";
      const result = await interpretText(
        { ...request(provider), model: undefined },
        {
          fetch: async (url, options) => {
            used =
              provider === "openai"
                ? String(JSON.parse(String(options?.body)).model)
                : decodeURIComponent(String(url));
            return response(provider);
          },
        },
      );
      assert.equal(result.ok, true, JSON.stringify(result.issues));
      const expected = provider === "openai" ? "gpt-6-astra" : "gemini-3.8-flash";
      assert.ok(used.includes(expected), used);
    }
  }
  process.env.OPENAI_MODEL = "  modelo-do-servidor ";
  let used = "";
  await interpretText(
    { ...request("openai"), model: undefined },
    {
      fetch: async (_url, options) => {
        used = String(JSON.parse(String(options?.body)).model);
        return response("openai");
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
      response("openai", JSON.stringify({ draft: offline.draft, fields })),
  });
  assert.equal(result.ok, false);
  assert.ok(
    result.issues.some((issue) => issue.code === "provider_invalid_provenance"),
  );
});
