import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { IDBFactory } from "fake-indexeddb";
import JSZip from "jszip";
import { applyCommands } from "../../src/client/commands.ts";
import { ProjectStore } from "../../src/client/project-store.ts";
import { createPortable, readPortable } from "../../src/client/portable.ts";
import type { CourseDraft } from "../../src/domain/course/index.ts";
import type { CourseProject } from "../../src/client/project.ts";
import { createProject, projectIdentity } from "../../src/client/project.ts";
import { importDocuments } from "../../src/server/import/index.ts";
import { captureProvenance } from "../../src/client/provenance.ts";

async function fixture(): Promise<CourseProject> {
  const draft = JSON.parse(
    await readFile(
      new URL("../fixtures/course-valid.json", import.meta.url),
      "utf8",
    ),
  ) as CourseDraft;
  draft.attachments = [];
  draft.sections.forEach((section) =>
    section.activities.forEach((activity) => {
      activity.attachmentIds = [];
    }),
  );
  return {
    version: 1,
    projectId: "project-fixture",
    draft,
    assets: [],
    sources: [],
    presets: [],
    profiles: {
      importProfile: "docx-topicos-v1",
      provider: "offline",
      pedagogy: "personalizado",
      compatibility: "moodle-4.1-core-v1",
    },
  };
}

test("commands preserve identity when reordering and increment one revision atomically", async () => {
  const project = await fixture();
  const draft = project.draft;
  const activity = draft.sections[0]!.activities[0]!;
  const result = applyCommands(draft, draft.revision, [
    { type: "move_activity", activityId: activity.id, to: 4 },
  ]);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.draft.revision, draft.revision + 1);
  assert.equal(result.draft.sections[0]!.activities[4]!.id, activity.id);
  assert.equal(draft.sections[0]!.activities[0]!.id, activity.id);
});

test("stale and partially invalid command batches do not change the draft", async () => {
  const { draft } = await fixture();
  const before = structuredClone(draft);
  assert.equal(applyCommands(draft, draft.revision - 1, []).ok, false);
  assert.equal(
    applyCommands(draft, draft.revision, [
      { type: "move_section", sectionId: "missing", to: 0 },
    ]).ok,
    false,
  );
  assert.deepEqual(draft, before);
});

test("IndexedDB persistence carries bytes and refuses an older tab overwrite", async () => {
  const store = new ProjectStore(new IDBFactory(), "atomic-project-test");
  const project = await fixture();
  project.sources.push({
    id: "source1",
    name: "origem.txt",
    mediaType: "text/plain",
    bytes: new TextEncoder().encode("origem preservada"),
  });
  await store.save(project, null);
  const next = structuredClone(project);
  next.draft.revision += 1;
  next.draft.metadata.fullName = "Alteração da primeira aba";
  await store.save(next, project.draft.revision);
  await assert.rejects(
    store.save(project, project.draft.revision),
    (error: unknown) =>
      error instanceof Error && /outra aba/i.test(error.message),
  );
  const loaded = await store.load(projectIdentity(project));
  assert.equal(loaded?.draft.metadata.fullName, next.draft.metadata.fullName);
  assert.deepEqual(loaded?.sources[0]?.bytes, project.sources[0]?.bytes);
  await store.close();
});

test("portable restores attachments, source bytes and custom presets", async () => {
  const project = await fixture();
  const bytes = new TextEncoder().encode("arquivo portátil");
  project.draft.attachments.push({
    id: "portable-file",
    name: "apoio.txt",
    size: bytes.length,
    mediaType: "text/plain",
  });
  project.draft.sections[0]!.activities[0]!.attachmentIds.push("portable-file");
  project.assets.push({
    id: "portable-file",
    name: "apoio.txt",
    mediaType: "text/plain",
    bytes,
  });
  project.sources.push({
    id: "source1",
    name: "fonte.txt",
    mediaType: "text/plain",
    bytes,
  });
  project.presets.push({
    id: "own-preset",
    name: "Minha organização",
    organization: "weeks",
  });
  const restored = await readPortable(await createPortable(project));
  assert.deepEqual(restored, project);
});

test("portable rejects corrupt bytes and unsafe archive paths before replacing data", async () => {
  const project = await fixture();
  const zip = await JSZip.loadAsync(await createPortable(project));
  zip.file("draft.json", "{}");
  await assert.rejects(
    readPortable(await zip.generateAsync({ type: "uint8array" })),
    /integridade|hash/i,
  );
  const unsafe = new JSZip();
  unsafe.file("../escape.txt", "escape");
  await assert.rejects(
    readPortable(await unsafe.generateAsync({ type: "uint8array" })),
    /caminho|path|seguro/i,
  );
});

test("portable refuses missing attachment bytes instead of presenting a complete copy", async () => {
  const project = await fixture();
  project.draft.attachments.push({
    id: "missing-file",
    name: "ausente.txt",
    size: 4,
    mediaType: "text/plain",
  });
  await assert.rejects(createPortable(project), /bytes|anexo/i);
});

test("two IndexedDB tabs race atomically and preserve exactly one accepted revision", async () => {
  const factory = new IDBFactory();
  const first = new ProjectStore(factory, "two-tabs");
  const second = new ProjectStore(factory, "two-tabs");
  const project = await fixture();
  await first.save(project, null);
  const a = structuredClone(project);
  const b = structuredClone(project);
  a.draft.revision++;
  b.draft.revision++;
  a.draft.metadata.fullName = "Primeira alteração";
  b.draft.metadata.fullName = "Segunda alteração";
  const result = await Promise.allSettled([
    first.save(a, project.draft.revision),
    second.save(b, project.draft.revision),
  ]);
  assert.equal(
    result.filter((entry) => entry.status === "fulfilled").length,
    1,
  );
  assert.equal(result.filter((entry) => entry.status === "rejected").length, 1);
  const saved = await first.load(projectIdentity(project));
  assert.equal(saved?.draft.revision, project.draft.revision + 1);
  assert.equal(
    saved?.draft.metadata.fullName,
    result[0]!.status === "fulfilled"
      ? a.draft.metadata.fullName
      : b.draft.metadata.fullName,
  );
  await Promise.all([first.close(), second.close()]);
});

test("invalid attachment edits cannot overwrite the previously saved project", async () => {
  const store = new ProjectStore(new IDBFactory(), "invalid-save");
  const project = await fixture();
  await store.save(project, null);
  const invalid = structuredClone(project);
  invalid.draft.revision++;
  invalid.draft.attachments.push({
    id: "lost",
    name: "lost.txt",
    size: 4,
    mediaType: "text/plain",
  });
  await assert.rejects(
    store.save(invalid, project.draft.revision),
    /bytes|anexo/i,
  );
  assert.deepEqual(await store.load(projectIdentity(project)), project);
  await store.close();
});

test("save captures valid bytes and revision before caller mutation while IndexedDB is pending", async () => {
  const store = new ProjectStore(new IDBFactory(), "snapshot-before-await");
  const project = await fixture();
  project.sources.push({
    id: "source-snapshot",
    name: "fonte.txt",
    mediaType: "text/plain",
    bytes: new Uint8Array([1, 2, 3]),
  });
  const expected = structuredClone(project);
  const saving = store.save(project, null);
  project.draft.metadata.fullName = "";
  project.projectId = "changed-after-save";
  project.draft.revision = 99;
  project.sources[0]!.bytes.fill(0);
  await saving;
  assert.deepEqual(await store.load(projectIdentity(expected)), expected);
  await store.close();
});

test("portable rejects unknown versions, private manifest fields and trailing entries", async () => {
  const project = await fixture();
  const original = await createPortable(project);
  for (const mutation of [
    (manifest: Record<string, unknown>) => {
      manifest.version = 99;
    },
    (manifest: Record<string, unknown>) => {
      manifest.apiKey = "private";
    },
  ]) {
    const zip = await JSZip.loadAsync(original);
    const manifest = JSON.parse(
      await zip.file("manifest.json")!.async("string"),
    ) as Record<string, unknown>;
    mutation(manifest);
    zip.file("manifest.json", JSON.stringify(manifest));
    await assert.rejects(
      readPortable(await zip.generateAsync({ type: "uint8array" })),
    );
  }
  const zip = await JSZip.loadAsync(original);
  zip.file("unexpected.txt", "extra");
  await assert.rejects(
    readPortable(await zip.generateAsync({ type: "uint8array" })),
    /não declarado|inesperado|manifesto/i,
  );
  assert.deepEqual(await readPortable(original), project);
});

test("different imported documents with equal course IDs remain independent saved workspaces", async () => {
  const files = await Promise.all(
    ["topicos-com-imagens.docx", "semanas-em-tabela.docx"].map(
      async (name) => ({
        id: "source-1",
        name,
        mediaType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        bytes: new Uint8Array(
          await readFile(
            new URL(`../fixtures/import/${name}`, import.meta.url),
          ),
        ),
      }),
    ),
  );
  const firstImport = await importDocuments({
    files: [files[0]],
    profile: "docx-topicos-v1",
    provider: "offline",
  });
  const secondImport = await importDocuments({
    files: [files[1]],
    profile: "docx-semanal-v1",
    provider: "offline",
  });
  assert.equal(firstImport.ok, true);
  assert.equal(secondImport.ok, true);
  if (!firstImport.ok || !secondImport.ok) return;
  assert.equal(firstImport.draft.id, secondImport.draft.id);
  const firstProject = createProject();
  const secondProject = createProject();
  firstProject.draft = firstImport.draft;
  secondProject.draft = secondImport.draft;
  for (const [project, result] of [
    [firstProject, firstImport],
    [secondProject, secondImport],
  ] as const) {
    const file = (entry: {
      id: string;
      name: string;
      mediaType: string;
      base64: string;
    }) => ({
      id: entry.id,
      name: entry.name,
      mediaType: entry.mediaType,
      bytes: Uint8Array.from(Buffer.from(entry.base64, "base64")),
    });
    project.sources = result.sources.map(file);
    project.assets = result.assets.map(file);
    project.provenance = captureProvenance(
      project.draft,
      result.provenance,
      result.preview,
    );
  }
  assert.notDeepEqual(
    firstProject.sources[0]?.bytes,
    secondProject.sources[0]?.bytes,
  );
  assert.notEqual(
    projectIdentity(firstProject),
    projectIdentity(secondProject),
  );
  const factory = new IDBFactory();
  const store = new ProjectStore(factory, "separate-imports");
  await store.save(firstProject, null);
  await store.save(secondProject, null);
  assert.equal((await store.list()).length, 2);
  assert.deepEqual(
    (await store.load(projectIdentity(firstProject)))?.draft,
    firstImport.draft,
  );
  assert.deepEqual(
    (await store.load(projectIdentity(secondProject)))?.draft,
    secondImport.draft,
  );
  const restored = await readPortable(await createPortable(secondProject));
  assert.equal(restored.projectId, secondProject.projectId);
  assert.deepEqual(restored.draft, secondImport.draft);
  assert.deepEqual(restored.provenance, secondProject.provenance);
  const otherTab = new ProjectStore(factory, "separate-imports");
  const edit = structuredClone(firstProject);
  edit.draft.revision++;
  await store.save(edit, firstProject.draft.revision);
  await assert.rejects(
    otherTab.save(firstProject, firstProject.draft.revision),
    /outra aba/i,
  );
  assert.deepEqual(
    await store.load(projectIdentity(secondProject)),
    secondProject,
  );
  await Promise.all([store.close(), otherTab.close()]);
});

test("version-one storage and portable copies acquire a stable identity without replacing their original records", async () => {
  const factory = new IDBFactory();
  const legacy = await fixture();
  delete legacy.projectId;
  const oldDb = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open("legacy-migration", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("projects", { keyPath: "draft.id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise<void>((resolve, reject) => {
    const tx = oldDb.transaction("projects", "readwrite");
    tx.objectStore("projects").put(legacy);
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
  });
  oldDb.close();
  const store = new ProjectStore(factory, "legacy-migration");
  const expected = { ...legacy, projectId: projectIdentity(legacy) };
  assert.deepEqual(await store.load(projectIdentity(legacy)), expected);
  assert.deepEqual(await store.list(), [expected]);
  const zip = await JSZip.loadAsync(await createPortable(legacy));
  const manifest = JSON.parse(
    await zip.file("manifest.json")!.async("string"),
  ) as Record<string, unknown>;
  delete manifest.projectId;
  zip.file("manifest.json", JSON.stringify(manifest));
  const portable = await readPortable(
    await zip.generateAsync({ type: "uint8array" }),
  );
  assert.deepEqual(portable, expected);
  const edit = structuredClone(expected);
  edit.draft.revision++;
  edit.draft.metadata.fullName = "Cópia migrada editada";
  await store.save(edit, expected.draft.revision);
  await store.close();
  const database = await new Promise<IDBDatabase>((resolve) => {
    const request = factory.open("legacy-migration", 2);
    request.onsuccess = () => resolve(request.result);
  });
  const preserved = await new Promise<CourseProject>((resolve) => {
    const request = database
      .transaction("projects")
      .objectStore("projects")
      .get(legacy.draft.id);
    request.onsuccess = () => resolve(request.result as CourseProject);
  });
  assert.deepEqual(preserved, legacy);
  database.close();
});
