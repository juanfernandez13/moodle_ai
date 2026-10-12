import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import tar from "tar-stream";
import { XMLValidator, XMLParser } from "fast-xml-parser";
import { exportCourse } from "../../src/server/export/index.ts";
import type { CourseDraft } from "../../src/domain/course/index.ts";

const fixture = (): CourseDraft =>
  JSON.parse(
    readFileSync(
      new URL("../fixtures/course-valid.json", import.meta.url),
      "utf8",
    ),
  );
const profileId = "moodle-4.1-core-v1" as const;
const bytesFor = (draft: CourseDraft) =>
  new Map(
    draft.attachments.map((ref) => [ref.id, new Uint8Array(ref.size).fill(65)]),
  );
async function entries(bytes: Uint8Array): Promise<Map<string, Buffer>> {
  const result = new Map<string, Buffer>();
  const extract = tar.extract();
  const done = new Promise<Map<string, Buffer>>((resolve, reject) => {
    extract.on("entry", (header, stream, next) => {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk) => {
        assert.ok(Buffer.isBuffer(chunk));
        chunks.push(chunk);
      });
      stream.on("end", () => {
        if (header.type === "file")
          result.set(header.name, Buffer.concat(chunks));
        next();
      });
      stream.on("error", reject);
      stream.resume();
    });
    extract.on("finish", () => resolve(result));
    extract.on("error", reject);
  });
  extract.end(gunzipSync(bytes));
  return done;
}
const xml = (files: Map<string, Buffer>, name: string) => {
  const content = files.get(name)?.toString("utf8");
  assert.ok(content, `${name} deve existir`);
  assert.equal(XMLValidator.validate(content), true);
  return new XMLParser({ ignoreAttributes: false, parseTagValue: false }).parse(
    content,
  );
};

test("MBZ público preserva seis atividades, metadados, notas, referências e bytes sem IA", async () => {
  const draft = fixture();
  const files = bytesFor(draft);
  const before = JSON.stringify(draft);
  const result = await exportCourse(draft, {
    profileId,
    resolveAttachment: async (id) => files.get(id) ?? null,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(
    result.artifact.sha256,
    createHash("sha256").update(result.artifact.bytes).digest("hex"),
  );
  assert.equal(result.revision, 3);
  const proof = result.warnings.find(
    (warning) => warning.code === "lab_validated",
  );
  assert.ok(proof);
  assert.match(proof.message, /4\.1\.17 \(Build: 20250317\)/);
  assert.doesNotMatch(proof.message, /4\.1\.17\+/);
  assert.match(proof.message, /não abrange outras versões/);
  const archive = await entries(result.artifact.bytes);
  for (const [name, content] of archive)
    if (name.endsWith(".xml"))
      assert.equal(XMLValidator.validate(content.toString("utf8")), true, name);
  const backup = xml(archive, "moodle_backup.xml").moodle_backup.information;
  assert.equal(backup.contents.activities.activity.length, 6);
  assert.deepEqual(
    backup.contents.activities.activity.map(
      (a: { modulename: string }) => a.modulename,
    ),
    ["forum", "forum", "assign", "assign", "quiz", "quiz"],
  );
  assert.equal(
    xml(archive, "course/course.xml").course.fullname,
    draft.metadata.fullName,
  );
  assert.equal(
    xml(archive, "course/course.xml").course.startdate,
    String(Date.parse(draft.metadata.startDate!) / 1000),
  );
  const assigns = [...archive]
    .filter(([name]) => name.endsWith("/assign.xml"))
    .map(
      ([, data]) =>
        new XMLParser({ parseTagValue: false }).parse(data.toString()).activity
          .assign,
    );
  assert.deepEqual(
    assigns.map((a) => a.grade),
    ["10", "100"],
  );
  const quizzes = [...archive]
    .filter(([name]) => name.endsWith("/quiz.xml"))
    .map(
      ([, data]) =>
        new XMLParser({ parseTagValue: false }).parse(data.toString()).activity
          .quiz,
    );
  assert.deepEqual(
    quizzes.map((q) => q.attempts_number),
    ["0", "2"],
  );
  assert.deepEqual(
    quizzes.map((q) => q.sections.section.shufflequestions),
    ["0", "1"],
  );
  const fileXml = xml(archive, "files.xml").files.file;
  for (const entry of fileXml.filter(
    (f: { filename: string }) => f.filename !== ".",
  )) {
    const payload = archive.get(
      `files/${entry.contenthash.slice(0, 2)}/${entry.contenthash}`,
    );
    assert.ok(payload);
    assert.equal(payload.length, Number(entry.filesize));
    assert.equal(
      createHash("sha1").update(payload).digest("hex"),
      entry.contenthash,
    );
  }
  assert.equal(JSON.stringify(draft), before);
});

test("exportação revalida e bloqueia arquivo ausente, divergente e erro do resolver sem vazar exceção", async () => {
  const draft = fixture();
  for (const resolver of [
    async () => null,
    async () => new Uint8Array(1),
    async () => {
      throw new Error("SECRET C:/private/path");
    },
  ]) {
    const result = await exportCourse(draft, {
      profileId,
      resolveAttachment: resolver,
    });
    assert.equal(result.ok, false);
    assert.doesNotMatch(JSON.stringify(result), /SECRET|private/);
  }
  const invalid = await exportCourse(
    { ...draft, schemaVersion: 99 },
    { profileId, resolveAttachment: async () => null },
  );
  assert.equal(invalid.ok, false);
});

test("cancelamento durante resolução não aguarda adapter bloqueado", async () => {
  const draft = fixture();
  const controller = new AbortController();
  const start = Date.now();
  const timer = setTimeout(() => controller.abort(), 10);
  const result = await exportCourse(draft, {
    profileId,
    signal: controller.signal,
    resolveAttachment: async () =>
      new Promise((resolve) => setTimeout(() => resolve(null), 300)),
  });
  clearTimeout(timer);
  assert.equal(result.ok, false);
  assert.ok(
    Date.now() - start < 150,
    "abort deve encerrar a espera pelo adapter",
  );
  if (!result.ok) assert.equal(result.issues[0]!.code, "export_cancelled");
});

test("fixture independente completa preserva três questões, imagens em seis destinos e chat junto de tarefa", async () => {
  const draft: CourseDraft = JSON.parse(
    readFileSync(
      new URL("../fixtures/export/full-course.json", import.meta.url),
      "utf8",
    ),
  );
  const assetBase64: Record<string, string> = JSON.parse(
    readFileSync(
      new URL("../fixtures/export/assets.json", import.meta.url),
      "utf8",
    ),
  );
  const result = await exportCourse(draft, {
    profileId,
    resolveAttachment: async (id) =>
      assetBase64[id] === undefined
        ? null
        : Buffer.from(assetBase64[id]!, "base64"),
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const archive = await entries(result.artifact.bytes);
  const backup = xml(archive, "moodle_backup.xml").moodle_backup.information;
  assert.equal(backup.contents.activities.activity.length, 9);
  assert.deepEqual(
    backup.contents.activities.activity.map(
      (a: { modulename: string }) => a.modulename,
    ),
    [
      "forum",
      "forum",
      "assign",
      "assign",
      "quiz",
      "quiz",
      "chat",
      "wiki",
      "glossary",
    ],
  );
  const questionXml = archive.get("questions.xml")!.toString("utf8");
  assert.equal(
    (questionXml.match(/<qtype>multichoice<\/qtype>/g) ?? []).length,
    2,
  );
  assert.equal((questionXml.match(/<qtype>match<\/qtype>/g) ?? []).length, 1);
  assert.equal((questionXml.match(/<qtype>essay<\/qtype>/g) ?? []).length, 1);
  assert.ok(
    questionXml.includes("<answertext>V</answertext>") &&
      questionXml.includes("<answertext>F</answertext>"),
  );
  const fileXml = xml(archive, "files.xml").files.file;
  const images = fileXml.filter(
    (f: { filename: string }) => f.filename === "diagrama.png",
  );
  assert.equal(images.length, 6);
  assert.deepEqual(
    new Set(
      images.map(
        (f: { component: string; filearea: string }) =>
          `${f.component}/${f.filearea}`,
      ),
    ),
    new Set([
      "course/summary",
      "course/section",
      "mod_forum/intro",
      "question/questiontext",
      "qtype_match/subquestion",
      "mod_glossary/entry",
    ]),
  );
  assert.equal(
    new Set(images.map((f: { contenthash: string }) => f.contenthash)).size,
    1,
  );
  const moduleIds = new Set(
    backup.contents.activities.activity.map(
      (a: { moduleid: string }) => a.moduleid,
    ),
  );
  const questionIds = new Set<string>();
  for (const match of questionXml.matchAll(
    /<question_bank_entry id="(\d+)"/g,
  )) {
    assert.ok(!questionIds.has(match[1]!));
    questionIds.add(match[1]!);
  }
  for (const item of backup.contents.activities.activity as Array<{
    directory: string;
    sectionid: string;
    moduleid: string;
  }>) {
    const module = xml(archive, `${item.directory}/module.xml`).module;
    assert.equal(module.sectionid, item.sectionid);
    assert.equal(module["@_id"], item.moduleid);
    if (
      item.directory.startsWith("quiz_") ||
      item.directory.includes("/quiz_")
    ) {
      const quiz = xml(archive, `${item.directory}/quiz.xml`).activity.quiz;
      const instances = Array.isArray(quiz.question_instances.question_instance)
        ? quiz.question_instances.question_instance
        : [quiz.question_instances.question_instance];
      for (const instance of instances)
        assert.ok(
          questionIds.has(instance.question_reference.questionbankentryid),
        );
    }
  }
  const sectionEntries = [...archive].filter(([name]) =>
    name.endsWith("/section.xml"),
  );
  const sequences = sectionEntries.flatMap(([name]) =>
    String(xml(archive, name).section.sequence || "")
      .split(",")
      .filter(Boolean),
  );
  assert.equal(sequences.length, 9);
  for (const id of sequences) assert.ok(moduleIds.has(id));
  assert.ok(
    archive
      .get("course/course.xml")!
      .toString("utf8")
      .includes("&amp;lt;script&amp;gt;"),
  );
});

test("perfil bloqueia precisão perdida, XML inválido, arquivos grandes e nomes de diretório", async () => {
  const mutations: Array<(draft: CourseDraft) => void> = [
    (draft) => {
      draft.metadata.startDate = "2026-10-12T12:00:00.0001Z";
    },
    (draft) => {
      draft.metadata.summary = "proibido\u0000";
    },
    (draft) => {
      draft.attachments[0]!.size = 16 * 1024 * 1024 + 1;
    },
    (draft) => {
      draft.attachments[0]!.name = "../arquivo.txt";
    },
    (draft) => {
      draft.metadata.organization = "weeks";
      delete draft.metadata.startDate;
    },
  ];
  for (const mutate of mutations) {
    const draft = fixture();
    mutate(draft);
    let called = false;
    const result = await exportCourse(draft, {
      profileId,
      resolveAttachment: async () => {
        called = true;
        return null;
      },
    });
    assert.equal(result.ok, false);
    assert.equal(called, false);
  }
});

test("exports concorrentes, anexos clonados e fechamento isolado preservam relações", async () => {
  const first = fixture();
  const second = fixture();
  second.id = "course-second";
  second.sections[0]!.activities.reverse();
  first.sections[0]!.activities[0]!.schedule = {
    closesAt: "2026-10-19T12:00:00Z",
  };
  const originalBytes = bytesFor(first);
  const originals = [...originalBytes.values()].map((bytes) =>
    Buffer.from(bytes),
  );
  const results = await Promise.all(
    [first, second].map((draft) =>
      exportCourse(draft, {
        profileId,
        resolveAttachment: async (id) => originalBytes.get(id) ?? null,
      }),
    ),
  );
  for (const result of results) {
    assert.ok(result.ok);
  }
  const result = results[0]!;
  if (!result.ok) return;
  const archive = await entries(result.artifact.bytes);
  const backup = xml(archive, "moodle_backup.xml").moodle_backup.information;
  const directory = backup.contents.activities.activity[0].directory;
  const availability = JSON.parse(
    xml(archive, `${directory}/module.xml`).module.availability,
  );
  assert.deepEqual(availability.c, [{ type: "date", d: "<", t: 1792411200 }]);
  let index = 0;
  for (const bytes of originalBytes.values())
    assert.deepEqual(Buffer.from(bytes), originals[index++]);
});

test("versão de módulos seleciona restauração moderna de question_reference no Moodle 4.1", async () => {
  const draft = fixture();
  const assets = bytesFor(draft);
  const result = await exportCourse(draft, {
    profileId,
    resolveAttachment: async (id) => assets.get(id) ?? null,
  });
  assert.ok(result.ok);
  if (!result.ok) return;
  const archive = await entries(result.artifact.bytes);
  const backup = xml(archive, "moodle_backup.xml").moodle_backup.information;
  for (const item of backup.contents.activities.activity as Array<{
    directory: string;
    modulename: string;
  }>) {
    const module = xml(archive, `${item.directory}/module.xml`).module;
    assert.equal(
      module["@_version"],
      item.modulename === "forum" || item.modulename === "assign"
        ? "2022112801"
        : "2022112800",
    );
  }
  const sections = backup.contents.sections.section;
  assert.equal(sections[0].title, "Geral");
  const rootSettings = backup.settings.setting
    .filter(
      (setting: { level: string; name: string }) => setting.level === "root",
    )
    .map((setting: { name: string }) => setting.name);
  assert.ok(!rootSettings.includes("questionbank"));
});

test("entradas editoriais do glossário ativam só userinfo necessário e não incluem contas", async () => {
  const draft: CourseDraft = JSON.parse(
    readFileSync(
      new URL("../fixtures/export/full-course.json", import.meta.url),
      "utf8",
    ),
  );
  const assets: Record<string, string> = JSON.parse(
    readFileSync(
      new URL("../fixtures/export/assets.json", import.meta.url),
      "utf8",
    ),
  );
  const result = await exportCourse(draft, {
    profileId,
    resolveAttachment: async (id) =>
      assets[id] === undefined ? null : Buffer.from(assets[id]!, "base64"),
  });
  assert.ok(result.ok);
  if (!result.ok) return;
  const archive = await entries(result.artifact.bytes);
  const backup = xml(archive, "moodle_backup.xml").moodle_backup.information;
  const settings: Array<{ level: string; name: string; value: string }> =
    backup.settings.setting;
  assert.equal(
    settings.find((setting) => setting.name === "users")!.value,
    "1",
  );
  const glossary = backup.contents.activities.activity.find(
    (activity: { modulename: string }) => activity.modulename === "glossary",
  );
  assert.equal(
    settings.find(
      (setting) => setting.name === `glossary_${glossary.moduleid}_userinfo`,
    )!.value,
    "1",
  );
  assert.equal(
    settings.find(
      (setting) => setting.name === `section_${glossary.sectionid}_userinfo`,
    )!.value,
    "1",
  );
  assert.ok(
    settings
      .filter(
        (setting) =>
          setting.level === "activity" &&
          setting.name.endsWith("_userinfo") &&
          !setting.name.startsWith("glossary_"),
      )
      .every((setting) => setting.value === "0"),
  );
  assert.equal(
    archive.get("users.xml")!.toString("utf8"),
    '<?xml version="1.0" encoding="UTF-8"?>\n<users></users>\n',
  );
  const glossaryXml = xml(archive, `${glossary.directory}/glossary.xml`)
    .activity.glossary;
  assert.equal(glossaryXml.entries.entry.userid, "0");
  assert.ok(
    result.warnings.some(
      (warning) => warning.code === "glossary_restore_setting",
    ),
  );
});
