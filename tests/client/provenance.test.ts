import { test } from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { IDBFactory } from "fake-indexeddb";
import { readFile } from "node:fs/promises";
import { interpretText } from "../../src/server/import/index.ts";
import { createProject, projectIdentity } from "../../src/client/project.ts";
import {
  captureProvenance,
  withDraft,
  originRows,
} from "../../src/client/provenance.ts";
import { createPortable, readPortable } from "../../src/client/portable.ts";
import { ProjectStore } from "../../src/client/project-store.ts";
import { applyCommands } from "../../src/client/commands.ts";

test("the import pipeline preserves per-field sources, provider, model and prompt through portable and IndexedDB", async () => {
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
  if (!offline.ok) return;
  const result = await interpretText(
    {
      text,
      profile: "docx-topicos-v1",
      provider: "openai",
      model: "audited-provider-fixture",
      apiKey: "MEMORY-SECRET",
    },
    {
      fetch: async () =>
        Response.json({
          status: "completed",
          output: [
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    draft: offline.draft,
                    fields: offline.provenance.fields,
                  }),
                },
              ],
            },
          ],
        }),
    },
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const project = createProject();
  project.draft = result.draft;
  project.sources = result.sources.map((source) => ({
    id: source.id,
    name: source.name,
    mediaType: source.mediaType,
    bytes: Uint8Array.from(Buffer.from(source.base64, "base64")),
  }));
  project.provenance = captureProvenance(
    project.draft,
    result.provenance,
    result.preview,
  );
  assert.ok(originRows(project).some((field) => field.origin === "extracted"));
  assert.deepEqual(project.provenance.fields, result.provenance.fields);
  const originalTitle = originRows(project).find(
    (field) => field.path === "sections[0].title",
  )!;
  const moved = applyCommands(project.draft, project.draft.revision, [
    { type: "move_section", sectionId: project.draft.sections[0]!.id, to: 1 },
  ]);
  assert.equal(moved.ok, true);
  if (moved.ok) {
    const reordered = withDraft(project, moved.draft);
    const title = originRows(reordered).find(
      (field) => field.path === "sections[1].title",
    )!;
    assert.equal(title.origin, "extracted");
    assert.equal(title.sourceId, originalTitle.sourceId);
    assert.equal(title.blockId, originalTitle.blockId);
  }
  const restored = await readPortable(await createPortable(project));
  assert.deepEqual(restored.provenance, project.provenance);
  assert.equal(restored.provenance?.promptVersion, "moodle-import-v1");
  assert.equal(restored.provenance?.model, "audited-provider-fixture");
  assert.equal(restored.provenance?.provider, "openai");
  const store = new ProjectStore(new IDBFactory(), "provenance-roundtrip");
  await store.save(project, null);
  assert.deepEqual(
    (await store.load(projectIdentity(project)))?.provenance,
    project.provenance,
  );
  await store.close();
  const zip = await JSZip.loadAsync(await createPortable(project));
  zip.file("provenance.json", "{}");
  await assert.rejects(
    readPortable(await zip.generateAsync({ type: "uint8array" })),
    /integridade|hash/i,
  );
});

test("user and preset origins follow entity IDs through reordering, while old projects remain valid", async () => {
  const project = createProject();
  const old = await readPortable(await createPortable(project));
  assert.equal(old.provenance, undefined);
  const editedDraft = structuredClone(project.draft);
  editedDraft.metadata.fullName = "Editado pela pessoa";
  editedDraft.revision++;
  const edited = withDraft(project, editedDraft);
  assert.equal(
    originRows(edited).find((field) => field.path === "metadata.fullName")
      ?.origin,
    "user",
  );
  const presetDraft = structuredClone(editedDraft);
  presetDraft.metadata.organization = "weeks";
  presetDraft.revision++;
  const preset = withDraft(edited, presetDraft, "preset", "preset-a");
  assert.equal(
    originRows(preset).find((field) => field.path === "metadata.organization")
      ?.presetId,
    "preset-a",
  );
  const before = originRows(preset).find(
    (field) => field.path === "metadata.fullName",
  );
  const next = applyCommands(preset.draft, preset.draft.revision, [
    { type: "move_section", sectionId: preset.draft.sections[0]!.id, to: 0 },
  ]);
  assert.equal(next.ok, true);
  if (next.ok)
    assert.deepEqual(
      originRows(withDraft(preset, next.draft)).find(
        (field) => field.path === "metadata.fullName",
      ),
      before,
    );
  assert.deepEqual(
    (await readPortable(await createPortable(preset))).provenance,
    preset.provenance,
  );
  const privateProject = structuredClone(preset);
  Object.assign(privateProject.provenance!, { apiKey: "private" });
  await assert.rejects(createPortable(privateProject));
});
