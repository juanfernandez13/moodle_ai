import { z } from "zod";
import { courseDraftSchema } from "../domain/course/schema.ts";
import type { CourseDraft, ContentBlock } from "../domain/course/index.ts";
import type { CourseProject } from "./project.ts";

const identifier = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/);
const path = z.string().min(1).max(1000);
export const sourcePreviewSchema = z.strictObject({
  sourceId: identifier,
  name: z.string().min(1).max(200),
  blocks: z
    .array(
      courseDraftSchema.shape.metadata.shape.summaryBlocks.unwrap().element,
    )
    .max(2000),
});
export const importProvenanceSchema = z.strictObject({
  profile: z.enum(["docx-topicos-v1", "docx-semanal-v1"]),
  provider: z.enum(["offline", "openai", "gemini"]),
  model: z.string().min(1).max(200).optional(),
  promptVersion: z.literal("moodle-import-v1"),
  schemaVersion: z.literal(1),
  fields: z
    .array(z.strictObject({ path, sourceId: identifier, blockId: identifier }))
    .max(20_000),
});
const originSchema = z.strictObject({
  entityId: identifier,
  field: path,
  origin: z.enum(["extracted", "user", "preset", "unknown"]),
  revision: z.number().int().nonnegative(),
  sourceId: identifier.optional(),
  blockId: identifier.optional(),
  presetId: identifier.optional(),
});
export const projectProvenanceSchema = importProvenanceSchema.extend({
  profile: z.enum(["docx-topicos-v1", "docx-semanal-v1", "unknown"]),
  provider: z.enum(["offline", "openai", "gemini", "unknown"]),
  promptVersion: z.enum(["moodle-import-v1", "unknown"]),
  preview: z.array(sourcePreviewSchema).max(100).optional(),
  origins: z.array(originSchema).max(50_000),
});
export type ProjectProvenance = z.infer<typeof projectProvenanceSchema>;
type IndexedField = {
  path: string;
  entityId: string;
  field: string;
  value: unknown;
};

function indexFields(draft: CourseDraft): IndexedField[] {
  const result: IndexedField[] = [];
  function visit(
    value: unknown,
    absolute: string,
    entityId: string,
    relative: string,
  ): void {
    if (Array.isArray(value)) {
      value.forEach((entry, index) =>
        visit(
          entry,
          `${absolute}[${index}]`,
          entityId,
          `${relative}[${index}]`,
        ),
      );
    } else if (value !== null && typeof value === "object") {
      const object = value as Record<string, unknown>;
      const nextEntity = typeof object.id === "string" ? object.id : entityId;
      const prefix = typeof object.id === "string" ? "" : relative;
      for (const [key, entry] of Object.entries(object)) {
        if (["id", "revision", "schemaVersion"].includes(key)) continue;
        visit(
          entry,
          absolute ? `${absolute}.${key}` : key,
          nextEntity,
          prefix ? `${prefix}.${key}` : key,
        );
      }
    } else result.push({ path: absolute, entityId, field: relative, value });
  }
  visit(draft, "", draft.id, "");
  return result;
}
const key = (field: { entityId: string; field: string }) =>
  `${field.entityId}:${field.field}`;

export function captureProvenance(
  draft: CourseDraft,
  input: unknown,
  preview: unknown,
): ProjectProvenance {
  const envelope = importProvenanceSchema.parse(input);
  const sources = z.array(sourcePreviewSchema).max(100).parse(preview);
  const indexed = indexFields(draft);
  const origins = envelope.fields.flatMap((source) =>
    indexed
      .filter(
        (field) =>
          field.path === source.path ||
          field.path.startsWith(`${source.path}.`) ||
          field.path.startsWith(`${source.path}[`),
      )
      .map((field) => ({
        entityId: field.entityId,
        field: field.field,
        origin: "extracted" as const,
        revision: draft.revision,
        sourceId: source.sourceId,
        blockId: source.blockId,
      })),
  );
  return projectProvenanceSchema.parse({
    ...envelope,
    preview: sources,
    origins,
  });
}

export function withDraft(
  project: CourseProject,
  draft: CourseDraft,
  origin: "user" | "preset" = "user",
  presetId?: string,
  forcePaths: string[] = [],
): CourseProject {
  const oldIndex = new Map(
    indexFields(project.draft).map((field) => [key(field), field]),
  );
  const newIndex = indexFields(draft);
  const keys = new Set(newIndex.map(key));
  const changed = newIndex.filter(
    (field) =>
      forcePaths.some(
        (path) =>
          field.path === path ||
          field.path.startsWith(`${path}.`) ||
          field.path.startsWith(`${path}[`),
      ) ||
      !oldIndex.has(key(field)) ||
      JSON.stringify(oldIndex.get(key(field))!.value) !==
        JSON.stringify(field.value),
  );
  if (changed.length === 0) return { ...project, draft };
  const changedKeys = new Set(changed.map(key));
  const previous = project.provenance ?? {
    profile: "unknown" as const,
    provider: "unknown" as const,
    promptVersion: "unknown" as const,
    schemaVersion: 1 as const,
    fields: [],
    origins: [],
  };
  const origins = [
    ...previous.origins.filter(
      (field) => keys.has(key(field)) && !changedKeys.has(key(field)),
    ),
    ...changed.map((field) => ({
      entityId: field.entityId,
      field: field.field,
      origin,
      revision: draft.revision,
      ...(presetId ? { presetId } : {}),
    })),
  ];
  return {
    ...project,
    draft,
    provenance: projectProvenanceSchema.parse({ ...previous, origins }),
  };
}

export function validateProvenance(project: CourseProject): void {
  if (!project.provenance) return;
  const provenance = projectProvenanceSchema.parse(project.provenance);
  const sources = new Set(project.sources.map((file) => file.id));
  const blocks = new Map<string, Set<string>>();
  function collect(items: ContentBlock[], ids: Set<string>) {
    for (const block of items) {
      ids.add(block.id);
      if (block.kind === "table")
        for (const row of block.rows)
          for (const cell of row) collect(cell.blocks, ids);
    }
  }
  for (const source of provenance.preview ?? []) {
    if (!sources.has(source.sourceId))
      throw new Error("A origem aponta para um documento ausente.");
    const ids = new Set<string>();
    collect(source.blocks, ids);
    blocks.set(source.sourceId, ids);
  }
  for (const field of provenance.fields) {
    if (!sources.has(field.sourceId))
      throw new Error("A rastreabilidade aponta para uma fonte ausente.");
    if (provenance.preview && !blocks.get(field.sourceId)?.has(field.blockId))
      throw new Error("Bloco de origem ausente na prévia preservada.");
  }
  for (const field of provenance.origins) {
    if (field.revision > project.draft.revision)
      throw new Error("Origem vinculada a uma revisão futura.");
    if (
      field.origin === "extracted" &&
      (!field.sourceId || !field.blockId || !sources.has(field.sourceId))
    )
      throw new Error("Origem extraída sem referência válida.");
    if (field.origin === "preset" && !field.presetId)
      throw new Error("Origem de preset sem identificação.");
  }
}

export function originRows(project: CourseProject) {
  const indexedOrigins = new Map<string, ProjectProvenance["origins"]>();
  for (const origin of project.provenance?.origins ?? []) {
    const list = indexedOrigins.get(key(origin)) ?? [];
    list.push(origin);
    indexedOrigins.set(key(origin), list);
  }
  return indexFields(project.draft).map((field) => {
    const matches = indexedOrigins.get(key(field)) ?? [];
    return {
      path: field.path,
      origin: matches[0]?.origin ?? "unknown",
      sourceId: matches
        .map((origin) => origin.sourceId)
        .filter(Boolean)
        .join(", "),
      blockId: matches
        .map((origin) => origin.blockId)
        .filter(Boolean)
        .join(", "),
      presetId: matches[0]?.presetId,
    };
  });
}
