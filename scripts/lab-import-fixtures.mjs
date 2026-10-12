// Synthetic fixtures only. This script never contacts a Moodle or AI provider.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { importDocuments } from "../src/server/import/index.ts";
import { exportCourse } from "../src/server/export/index.ts";
const directory = resolve(process.argv[2] ?? "tmp/lab-import");
const reviewedWeekStart = process.argv[3];
await mkdir(directory, { recursive: true });
for (const [name, profile] of [
  ["topicos-com-imagens.docx", "docx-topicos-v1"],
  ["semanas-em-tabela.docx", "docx-semanal-v1"],
]) {
  const bytes = await readFile(
    new URL(`../tests/fixtures/import/${name}`, import.meta.url),
  );
  const imported = await importDocuments({
    files: [
      {
        id: "fixture",
        name,
        mediaType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        bytes,
      },
    ],
    profile,
    provider: "offline",
  });
  assert.equal(imported.ok, true, JSON.stringify(imported.issues));
  const reviewChanges = [];
  if (
    imported.draft.metadata.organization === "weeks" &&
    imported.draft.metadata.startDate === undefined
  ) {
    assert.ok(
      reviewedWeekStart,
      "Passe uma data ISO explícita como segundo argumento: a revisão semanal exige início antes de exportar.",
    );
    imported.draft.metadata.startDate = reviewedWeekStart;
    imported.draft.revision += 1;
    reviewChanges.push({
      path: "metadata.startDate",
      value: reviewedWeekStart,
      reason:
        "Revisão explícita da fixture fictícia; não extraído nem inventado pelo importador.",
    });
  }
  const assets = Object.fromEntries(
    imported.assets.map((asset) => [asset.id, asset.base64]),
  );
  const exported = await exportCourse(imported.draft, {
    profileId: "moodle-4.1-core-v1",
    resolveAttachment: async (id) =>
      assets[id] === undefined ? null : Buffer.from(assets[id], "base64"),
  });
  assert.equal(exported.ok, true, JSON.stringify(exported.issues));
  const prefix = name.replace(/\.docx$/, "");
  await writeFile(
    resolve(directory, `${prefix}.draft.json`),
    JSON.stringify(imported.draft, null, 2) + "\n",
  );
  await writeFile(
    resolve(directory, `${prefix}.assets.json`),
    JSON.stringify(assets, null, 2) + "\n",
  );
  await writeFile(resolve(directory, `${prefix}.mbz`), exported.artifact.bytes);
  console.log(
    JSON.stringify({
      fixture: name,
      profile,
      sourceSha256: createHash("sha256").update(bytes).digest("hex"),
      artifactSha256: exported.artifact.sha256,
      bytes: exported.artifact.bytes.length,
      sections: imported.draft.sections.length,
      activities: imported.draft.sections.flatMap(
        (section) => section.activities,
      ).length,
      assets: imported.assets.length,
      reviewChanges,
      warnings: imported.issues.map((issue) => issue.code),
    }),
  );
}
