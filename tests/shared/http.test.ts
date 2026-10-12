import test from "node:test";
import assert from "node:assert/strict";
import { readJsonBody, readFormBody } from "../../src/shared/http.ts";
test("JSON grande sem Content-Length é barrado pelo corpo real", async () => {
  const request = new Request("http://localhost/api/test", {
    method: "POST",
    body: JSON.stringify({ text: "a".repeat(1000) }),
  });
  await assert.rejects(readJsonBody(request, 10), {
    code: "request_too_large",
  });
});
test("JSON malformado não ecoa entrada no diagnóstico", async () => {
  await assert.rejects(
    readJsonBody(
      new Request("http://localhost", {
        method: "POST",
        body: "private-do-not-print",
      }),
      100,
    ),
    (error: unknown) =>
      error instanceof Error && !error.message.includes("private-do-not-print"),
  );
});
test("JSON e multipart reais pequenos são lidos sem alteração", async () => {
  assert.deepEqual(
    await readJsonBody(
      new Request("http://localhost", { method: "POST", body: '{"a":1}' }),
      100,
    ),
    { a: 1 },
  );
  const form = new FormData();
  form.set("draft", '{"revision":2}');
  form.set("file:a", new Blob(["abc"]), "a.txt");
  const parsed = await readFormBody(
    new Request("http://localhost", { method: "POST", body: form }),
    10_000,
  );
  assert.equal(parsed.get("draft"), '{"revision":2}');
  const file = parsed.get("file:a");
  assert.ok(file instanceof File);
  assert.equal(await file.text(), "abc");
});
