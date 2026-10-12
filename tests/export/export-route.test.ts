import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { POST } from "../../app/api/export/route.ts";
import type { CourseDraft } from "../../src/domain/course/index.ts";

function requestForm(): FormData {
  const draft: CourseDraft = JSON.parse(
    readFileSync(
      new URL("../fixtures/course-valid.json", import.meta.url),
      "utf8",
    ),
  );
  const form = new FormData();
  form.set("draft", JSON.stringify(draft));
  for (const attachment of draft.attachments)
    form.set(
      `file:${attachment.id}`,
      new Blob([new Uint8Array(attachment.size).fill(65)], {
        type: attachment.mediaType,
      }),
      attachment.name,
    );
  return form;
}
const request = (form: FormData) =>
  new Request("http://localhost/api/export", { method: "POST", body: form });

test("rota pública exporta multipart com revisão/hash e download seguro", async () => {
  const response = await POST(request(requestForm()));
  assert.equal(response.status, 200);
  const body = new Uint8Array(await response.arrayBuffer());
  assert.equal(
    response.headers.get("x-content-sha256"),
    createHash("sha256").update(body).digest("hex"),
  );
  assert.equal(response.headers.get("x-moodleai-revision"), "3");
  assert.equal(
    response.headers.get("x-moodleai-compatibility"),
    "lab-validated",
  );
  assert.equal(response.headers.get("x-moodleai-lab-release"), "4.1.17");
  assert.equal(response.headers.get("x-moodleai-lab-build"), "20250317");
  assert.equal(response.headers.get("content-type"), "application/gzip");
  assert.match(
    response.headers.get("content-disposition")!,
    /^attachment; filename="moodle-course-demo\.mbz"$/,
  );
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("rota bloqueia JSON inválido, arquivo ausente, campo desconhecido e draft duplicado", async () => {
  const forms = [requestForm(), requestForm(), requestForm(), requestForm()];
  forms[0]!.set("draft", "{ SECRET");
  forms[1]!.delete("file:attachment-plan");
  forms[2]!.set("file:unknown-private-id", new Blob(["secret"]), "secret");
  forms[3]!.append("draft", "{}");
  for (const form of forms) {
    const response = await POST(request(form));
    assert.equal(response.status, 422);
    const text = await response.text();
    assert.ok(JSON.parse(text).issues.length);
    assert.doesNotMatch(text, /SECRET|unknown-private-id/);
  }
});

test("rota aplica teto total pelo helper mesmo antes de interpretar multipart", async () => {
  const response = await POST(
    new Request("http://localhost/api/export", {
      method: "POST",
      headers: {
        "content-length": String(70 * 1024 * 1024),
        "content-type": "application/octet-stream",
      },
      body: "x",
    }),
  );
  assert.equal(response.status, 422);
  assert.equal((await response.json()).issues[0].code, "request_too_large");
});
