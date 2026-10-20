// Shared helpers for the .mbz exporter tests: build a small draft, export it and read the archive back.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import tar from "tar-stream";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { exportCourse } from "../../src/server/export/index.ts";
import type {
  Activity,
  AttachmentRef,
  CourseDraft,
  Section,
} from "../../src/domain/course/index.ts";

export const profileId = "moodle-4.1-core-v1" as const;
const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false });

/** Normalizes the parser's "one child = object, many = array" shape. */
export function list<T>(value: T | T[] | undefined | ""): T[] {
  if (value === undefined || value === "") return [];
  return Array.isArray(value) ? value : [value];
}
export const seconds = (iso: string) => String(Date.parse(iso) / 1000);
export const sha1 = (bytes: Uint8Array) =>
  createHash("sha1").update(bytes).digest("hex");

export type FileBytes = Map<string, Uint8Array>;
export function attachment(
  id: string,
  name: string,
  content: string,
  mediaType = "application/pdf",
): { ref: AttachmentRef; bytes: Uint8Array } {
  const bytes = new TextEncoder().encode(content);
  return { ref: { id, name, size: bytes.byteLength, mediaType }, bytes };
}

export function section(
  id: string,
  activities: Activity[],
  title = `Unidade ${id}`,
): Section {
  return { id, title, summary: "", activities };
}
export function draft(
  sections: Section[],
  files: { ref: AttachmentRef; bytes: Uint8Array }[] = [],
  extra: Partial<CourseDraft> = {},
): { draft: CourseDraft; bytes: FileBytes } {
  return {
    draft: {
      schemaVersion: 1,
      id: "course-test",
      revision: 1,
      metadata: {
        fullName: "Curso de Teste",
        shortName: "TESTE",
        summary: "",
        organization: "topics",
      },
      sections,
      attachments: files.map((file) => file.ref),
      ...extra,
    },
    bytes: new Map(files.map((file) => [file.ref.id, file.bytes])),
  };
}

export const forum = (
  id: string,
  extra: Partial<Extract<Activity, { type: "forum" }>> = {},
): Activity => ({
  id,
  type: "forum",
  title: `Fórum ${id}`,
  description: "Apresente-se.",
  attachmentIds: [],
  settings: { discussionMode: "general" },
  ...extra,
});
export const assignment = (
  id: string,
  extra: Partial<Extract<Activity, { type: "assignment" }>> = {},
): Activity => ({
  id,
  type: "assignment",
  title: `Tarefa ${id}`,
  description: "Envie o relatório.",
  attachmentIds: [],
  settings: { maxGrade: 10, submissionMode: "file" },
  ...extra,
});

async function untar(bytes: Uint8Array): Promise<Map<string, Buffer>> {
  const result = new Map<string, Buffer>();
  const extract = tar.extract();
  const done = new Promise<Map<string, Buffer>>((resolve, reject) => {
    extract.on("entry", (header, stream, next) => {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: unknown) => {
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

export type Mbz = Awaited<ReturnType<typeof exportMbz>>;
/** Exports a draft that must be valid and returns accessors for the restored archive. */
export async function exportMbz(input: { draft: CourseDraft; bytes: FileBytes }) {
  const result = await exportCourse(input.draft, {
    profileId,
    resolveAttachment: async (id) => input.bytes.get(id) ?? null,
  });
  assert.ok(result.ok, JSON.stringify(result));
  const archive = await untar(result.artifact.bytes);
  const xml = (name: string) => {
    const content = archive.get(name)?.toString("utf8");
    assert.ok(content !== undefined, `${name} deve existir no pacote`);
    assert.equal(XMLValidator.validate(content), true, name);
    return parser.parse(content);
  };
  const backup = xml("moodle_backup.xml").moodle_backup.information;
  const entries = list<{
    moduleid: string;
    sectionid: string;
    modulename: string;
    title: string;
    directory: string;
  }>(backup.contents.activities.activity);
  /** Locates an activity by the draft ID, which the exporter keeps as the module idnumber. */
  const activity = (draftId: string) => {
    for (const entry of entries) {
      const module = xml(`${entry.directory}/module.xml`).module;
      if (module.idnumber === draftId)
        return {
          entry,
          module,
          dir: entry.directory,
          body: xml(`${entry.directory}/${entry.modulename}.xml`).activity,
          inforef: xml(`${entry.directory}/inforef.xml`).inforef,
          grades: xml(`${entry.directory}/grades.xml`).activity_gradebook,
        };
    }
    assert.fail(`atividade ${draftId} não encontrada no pacote`);
  };
  const sections = () =>
    list<{ sectionid: string; directory: string }>(
      backup.contents.sections.section,
    ).map((item) => xml(`${item.directory}/section.xml`).section);
  const files = () =>
    list<Record<string, string>>(xml("files.xml").files.file);
  const setting = (name: string) =>
    list<{ name: string; value: string }>(backup.settings.setting).find(
      (item) => item.name === name,
    )?.value;
  return { result, archive, xml, backup, entries, activity, sections, files, setting };
}

type FileRow = Record<
  | "@_id"
  | "contextid"
  | "component"
  | "filearea"
  | "itemid"
  | "filename"
  | "filesize"
  | "mimetype"
  | "contenthash",
  string
>;
/** Files of one activity, with the bytes the archive stores under their content hash. */
export function activityFiles(
  mbz: Mbz,
  contextId: string,
): (FileRow & { stored: Buffer | undefined })[] {
  return mbz
    .files()
    .filter((file) => file.contextid === contextId && file.filename !== ".")
    .map((file) => ({
      ...(file as FileRow),
      stored: mbz.archive.get(
        `files/${file.contenthash!.slice(0, 2)}/${file.contenthash}`,
      ),
    }));
}
