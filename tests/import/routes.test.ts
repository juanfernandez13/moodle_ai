import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { POST as importPost } from "../../app/api/import/route.ts";
import { POST as interpretPost } from "../../app/api/interpret/route.ts";
import {
  IMPORT_LIMITS,
  interpretText,
} from "../../src/server/import/index.ts";
import { UPLOAD_MESSAGES } from "../../src/shared/upload-limits.ts";

const text = await readFile(
  new URL("../fixtures/import/topics.txt", import.meta.url),
  "utf8",
);
function formRequest(
  configure?: (form: FormData) => void,
  origin: string | null = "http://localhost",
): Request {
  const form = new FormData();
  form.append(
    "files",
    new File([text], "planejamento.txt", { type: "text/plain" }),
  );
  form.set("profile", "docx-topicos-v1");
  form.set("provider", "offline");
  configure?.(form);
  return new Request("http://localhost/api/import", {
    method: "POST",
    headers: origin === null ? {} : { origin },
    body: form,
  });
}

test("rotas multipart e JSON retornam o mesmo curso e arquivos portáteis", async () => {
  const imported = await importPost(formRequest());
  assert.equal(imported.status, 200);
  const body = await imported.json();
  assert.equal(body.ok, true);
  assert.equal(body.sources[0].base64, Buffer.from(text).toString("base64"));
  assert.equal(imported.headers.get("cache-control"), "no-store");
  const interpreted = await interpretPost(
    new Request("http://localhost/api/interpret", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost",
      },
      body: JSON.stringify({
        text,
        profile: "docx-topicos-v1",
        provider: "offline",
      }),
    }),
  );
  assert.equal(interpreted.status, 200);
  const other = await interpreted.json();
  assert.equal(other.draft.metadata.fullName, body.draft.metadata.fullName);
  assert.deepEqual(
    other.draft.sections.map((section: { title: string }) => section.title),
    body.draft.sections.map((section: { title: string }) => section.title),
  );
});

test("multipart rejeita campo interno, configuração repetida e arquivo faltante", async () => {
  for (const configure of [
    (form: FormData) => form.append("filePath", "PATH-SECRET"),
    (form: FormData) => form.append("provider", "gemini"),
    (form: FormData) => form.delete("files"),
    (form: FormData) => form.append("files", "NOT-A-FILE"),
  ]) {
    const response = await importPost(formRequest(configure));
    assert.equal(response.status, 422);
    const body = await response.text();
    assert.equal(body.includes("PATH-SECRET"), false);
    assert.equal(body.includes("NOT-A-FILE"), false);
    assert.equal(JSON.parse(body).ok, false);
  }
});

test("limite do corpo é aplicado antes de ler arquivos e JSON malformado é sanitizado", async () => {
  const request = new Request("http://localhost/api/import", {
    method: "POST",
    headers: {
      origin: "http://localhost",
      "content-type": "multipart/form-data; boundary=empty",
      "content-length": String(IMPORT_LIMITS.maxTotalBytes + 1024 * 1024),
    },
    body: "SECRET",
  });
  const large = await importPost(request);
  assert.equal(large.status, 413);
  const largeText = await large.text();
  assert.equal(largeText.includes("SECRET"), false);
  assert.equal(
    JSON.parse(largeText).issues[0].message,
    UPLOAD_MESSAGES.totalSize,
  );
  const invalid = await interpretPost(
    new Request("http://localhost/api/interpret", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost",
      },
      body: "SECRET",
    }),
  );
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.text()).includes("SECRET"), false);
});

test("rota não aplica fallback para provedor sem chave", async () => {
  const response = await interpretPost(
    new Request("http://localhost/api/interpret", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost",
      },
      body: JSON.stringify({
        text,
        profile: "docx-topicos-v1",
        provider: "gemini",
        apiKey: "",
      }),
    }),
  );
  assert.equal(response.status, 422);
  const result = await response.json();
  assert.equal(result.ok, false);
  assert.ok(
    result.issues.some(
      (issue: { code: string }) => issue.code === "provider_unconfigured",
    ),
  );
});

test("solicitações externas e sem Origin não podem consumir chave sintética do servidor", async (context) => {
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "SYNTHETIC-CSRF-TEST-KEY";
  context.after(() => {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  });
  const fixture = await interpretText({
    text,
    profile: "docx-topicos-v1",
    provider: "offline",
  });
  assert.equal(fixture.ok, true);
  if (!fixture.ok) return;
  let calls = 0;
  context.mock.method(globalThis, "fetch", async () => {
    calls++;
    return Response.json({
      status: "completed",
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: JSON.stringify({ draft: fixture.draft, fields: [] }),
            },
          ],
        },
      ],
    });
  });
  for (const origin of [
    "https://outside.example",
    null,
    "null",
    "http://localhost:1234",
    "http://localhost/path",
  ]) {
    const headers = {
      "content-type": "application/json",
      ...(origin === null ? {} : { origin }),
    };
    const json = await interpretPost(
      new Request("http://localhost/api/interpret", {
        method: "POST",
        headers,
        body: JSON.stringify({
          text,
          profile: "docx-topicos-v1",
          provider: "openai",
          model: "synthetic-model",
        }),
      }),
    );
    const multipart = await importPost(
      formRequest((form) => {
        form.set("provider", "openai");
        form.set("model", "synthetic-model");
      }, origin),
    );
    assert.equal(
      calls,
      0,
      "Interpretação e importação rejeitadas não chamam a IA.",
    );
    assert.equal(json.status, 403);
    assert.equal(
      (await json.text()).includes("SYNTHETIC-CSRF-TEST-KEY"),
      false,
    );
    assert.equal(calls, 0, "Importação rejeitada não chama a IA.");
    assert.equal(multipart.status, 403);
    assert.equal(
      (await multipart.text()).includes("SYNTHETIC-CSRF-TEST-KEY"),
      false,
    );
  }
});

test("texto simples com JSON não alcança o provedor mesmo com Origin legítimo", async (context) => {
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "SYNTHETIC-CSRF-TEST-KEY";
  context.after(() => {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  });
  let calls = 0;
  context.mock.method(globalThis, "fetch", async () => {
    calls++;
    return new Response("{}", { status: 500 });
  });
  const response = await interpretPost(
    new Request("http://localhost/api/interpret", {
      method: "POST",
      headers: { origin: "http://localhost", "content-type": "text/plain" },
      body: JSON.stringify({
        text,
        profile: "docx-topicos-v1",
        provider: "openai",
        model: "synthetic-model",
      }),
    }),
  );
  assert.equal(calls, 0);
  assert.equal(response.status, 415);
});

test("Origin legítimo e application/json mantêm provider funcional sem persistir a chave", async (context) => {
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "SYNTHETIC-CSRF-TEST-KEY";
  context.after(() => {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  });
  const fixture = await interpretText({
    text,
    profile: "docx-topicos-v1",
    provider: "offline",
  });
  assert.equal(fixture.ok, true);
  if (!fixture.ok) return;
  let calls = 0;
  context.mock.method(
    globalThis,
    "fetch",
    async (_url: unknown, options: RequestInit) => {
      calls++;
      assert.equal(
        new Headers(options.headers).get("authorization"),
        "Bearer SYNTHETIC-CSRF-TEST-KEY",
      );
      return Response.json({
        status: "completed",
        output: [
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text: JSON.stringify({ draft: fixture.draft, fields: [] }),
              },
            ],
          },
        ],
      });
    },
  );
  const response = await interpretPost(
    new Request("http://localhost/api/interpret", {
      method: "POST",
      headers: {
        origin: "http://localhost",
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        text,
        profile: "docx-topicos-v1",
        provider: "openai",
        model: "synthetic-model",
      }),
    }),
  );
  assert.equal(response.status, 200);
  assert.equal(calls, 1);
  assert.equal(
    (await response.text()).includes("SYNTHETIC-CSRF-TEST-KEY"),
    false,
  );
  const multipart = await importPost(
    formRequest((form) => {
      form.set("provider", "openai");
      form.set("model", "synthetic-model");
    }),
  );
  assert.equal(multipart.status, 200);
  assert.equal(calls, 2);
  assert.equal(
    (await multipart.text()).includes("SYNTHETIC-CSRF-TEST-KEY"),
    false,
  );
});
