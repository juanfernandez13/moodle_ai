import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { exportCourse } from "../src/server/export/index.ts";
const directory = resolve(process.argv[2] ?? "tmp/lab-complete");
await mkdir(directory, { recursive: true });
const bytes = await readFile(
  new URL("../docs/examples/planejamento-completo.docx", import.meta.url),
);
const form = new FormData();
form.set(
  "files",
  new File([bytes], "planejamento-completo.docx", {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  }),
);
form.set("profile", "docx-topicos-v1");
form.set("provider", "offline");
const response = await fetch("http://127.0.0.1:3210/api/import", {
  method: "POST",
  headers: { Origin: "http://127.0.0.1:3210" },
  body: form,
});
const result = await response.json();
assert.equal(response.status, 200, JSON.stringify(result));
assert.equal(result.ok, true);
const activities = result.draft.sections.flatMap(
  (section) => section.activities,
);
assert.equal(activities.length, 9);
for (const type of ["forum", "assignment", "quiz"])
  assert.equal(
    activities.filter((activity) => activity.type === type).length,
    2,
  );
assert.deepEqual(
  [...new Set(activities.map((activity) => activity.type))].sort(),
  ["assignment", "chat", "forum", "glossary", "quiz", "wiki"],
);
assert.deepEqual(
  activities
    .filter((activity) => activity.type === "quiz")
    .flatMap((activity) => activity.questions.map((question) => question.type))
    .sort(),
  ["essay", "matching", "multiple-choice"],
);
const assets = Object.fromEntries(
  result.assets.map((asset) => [asset.id, asset.base64]),
);
const exported = await exportCourse(result.draft, {
  profileId: "moodle-4.1-core-v1",
  resolveAttachment: async (id) =>
    assets[id] === undefined ? null : Buffer.from(assets[id], "base64"),
});
assert.equal(exported.ok, true, JSON.stringify(exported.issues));
await writeFile(
  resolve(directory, "draft.json"),
  JSON.stringify(result.draft, null, 2) + "\n",
);
await writeFile(
  resolve(directory, "assets.json"),
  JSON.stringify(assets, null, 2) + "\n",
);
await writeFile(resolve(directory, "complete.mbz"), exported.artifact.bytes);
await writeFile(
  resolve(directory, "evidence.json"),
  JSON.stringify(
    {
      source: "planejamento-completo.docx",
      importHTTPStatus: response.status,
      provider: result.provenance.provider,
      activities: activities.length,
      questionTypes: ["essay", "matching", "multiple-choice"],
      artifactSha256: exported.artifact.sha256,
      reviewChanges: [],
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    ok: true,
    status: response.status,
    activities: activities.length,
    sha256: exported.artifact.sha256,
  }),
);
