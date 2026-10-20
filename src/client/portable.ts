import JSZip from "jszip";
import { z } from "zod";
import { validateDraft } from "../domain/course/index.ts";
import { courseDraftSchema } from "../domain/course/schema.ts";
import { readArchive, hash256 } from "../shared/archive.ts";
import { formatMegabytes } from "../shared/upload-limits.ts";
import {
  PROJECT_FILE_LIMITS,
  projectIdentity,
  validateProject,
} from "./project.ts";
import { projectProvenanceSchema } from "./provenance.ts";
import type { CourseProject, ProjectFile, ProjectPreset } from "./project.ts";

// A copy holds everything a project can: attachments, imported sources and the
// project's own documents (course, presets, provenance, manifest). DOCX and PDF
// are already compressed, so the zip can be as large as its contents.
const limits = {
  maxEntries: 1000,
  maxEntryBytes: PROJECT_FILE_LIMITS.sourceBytes,
  maxTotalBytes:
    PROJECT_FILE_LIMITS.attachmentsTotalBytes +
    PROJECT_FILE_LIMITS.sourcesTotalBytes +
    16 * 1024 * 1024,
};
const MAX_ZIP = limits.maxTotalBytes;
const zipLimitMessage = `A cópia portátil pode ter até ${formatMegabytes(MAX_ZIP)} compactados.`;
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const text = z.string().min(1).max(200);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const fileSchema = z.strictObject({
  id: text.regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/),
  path: text,
  name: text,
  mediaType: text,
  size: z.number().int().min(0).max(limits.maxEntryBytes),
  sha256: hash,
});
const profiles = z.strictObject({
  importProfile: z.enum(["docx-topicos-v1", "docx-semanal-v1"]),
  provider: z.enum(["offline", "openai", "gemini"]),
  pedagogy: text,
  compatibility: z.literal("moodle-4.1-core-v1"),
});
const manifestSchema = z.strictObject({
  version: z.literal(1),
  projectId: z
    .string()
    .regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,199}$/)
    .optional(),
  draft: z.strictObject({ path: z.literal("draft.json"), sha256: hash }),
  presets: z.strictObject({ path: z.literal("presets.json"), sha256: hash }),
  provenance: z
    .strictObject({ path: z.literal("provenance.json"), sha256: hash })
    .optional(),
  profiles,
  assets: z.array(fileSchema).max(500),
  sources: z.array(fileSchema).max(100),
});
const presetsSchema = z
  .array(
    z.strictObject({
      id: text,
      name: text,
      organization: z.enum(["topics", "weeks"]).optional(),
      gradebook: courseDraftSchema.shape.gradebook,
    }),
  )
  .max(100);

export async function createPortable(
  project: CourseProject,
): Promise<Uint8Array> {
  validateProject(project);
  profiles.parse(project.profiles);
  presetsSchema.parse(project.presets);
  const zip = new JSZip();
  const draftBytes = encoder.encode(JSON.stringify(project.draft));
  const presetBytes = encoder.encode(JSON.stringify(project.presets));
  zip.file("draft.json", draftBytes);
  zip.file("presets.json", presetBytes);
  const provenanceBytes = project.provenance
    ? encoder.encode(JSON.stringify(project.provenance))
    : undefined;
  if (provenanceBytes) zip.file("provenance.json", provenanceBytes);
  const files = async (entries: ProjectFile[], directory: string) =>
    Promise.all(
      entries.map(async (entry) => {
        const path = `${directory}/${entry.id}.bin`;
        zip.file(path, entry.bytes, { createFolders: false });
        return {
          id: entry.id,
          path,
          name: entry.name,
          mediaType: entry.mediaType,
          size: entry.bytes.length,
          sha256: await hash256(entry.bytes),
        };
      }),
    );
  const assets = await files(project.assets, "assets");
  const sources = await files(project.sources, "sources");
  const manifest = {
    version: 1,
    projectId: projectIdentity(project),
    draft: { path: "draft.json", sha256: await hash256(draftBytes) },
    presets: { path: "presets.json", sha256: await hash256(presetBytes) },
    profiles: project.profiles,
    assets,
    sources,
    ...(provenanceBytes
      ? {
          provenance: {
            path: "provenance.json",
            sha256: await hash256(provenanceBytes),
          },
        }
      : {}),
  };
  manifestSchema.parse(manifest);
  const manifestBytes = encoder.encode(JSON.stringify(manifest));
  const documents = [
    draftBytes,
    presetBytes,
    manifestBytes,
    ...(provenanceBytes ? [provenanceBytes] : []),
  ];
  if (documents.some((entry) => entry.length > limits.maxEntryBytes))
    throw new Error(
      `Um documento interno do projeto ultrapassa ${formatMegabytes(limits.maxEntryBytes)}. Reduza o conteúdo antes de exportar.`,
    );
  const expanded =
    documents.reduce((total, entry) => total + entry.length, 0) +
    [...project.assets, ...project.sources].reduce(
      (total, file) => total + file.bytes.length,
      0,
    );
  if (expanded > limits.maxTotalBytes)
    throw new Error(
      `O projeto portátil completo ultrapassa ${formatMegabytes(limits.maxTotalBytes)} expandidos, incluindo conteúdo e rastreabilidade.`,
    );
  zip.file("manifest.json", manifestBytes);
  const bytes = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  if (bytes.length > MAX_ZIP) throw new Error(zipLimitMessage);
  return bytes;
}

export async function readPortable(bytes: Uint8Array): Promise<CourseProject> {
  if (bytes.length > MAX_ZIP) throw new Error(zipLimitMessage);
  const entries = await readArchive(bytes, limits);
  const manifestBytes = entries.get("manifest.json");
  if (!manifestBytes) throw new Error("Manifesto do projeto não encontrado.");
  const parsed = manifestSchema.safeParse(
    JSON.parse(decoder.decode(manifestBytes)),
  );
  if (!parsed.success)
    throw new Error(
      "Versão ou manifesto do projeto inválido. Chaves e campos internos não são permitidos.",
    );
  const manifest = parsed.data;
  const usedPaths = new Set(["manifest.json", "draft.json", "presets.json"]);
  const requireBytes = async (
    path: string,
    expectedHash: string,
    size?: number,
  ) => {
    const value = entries.get(path);
    if (
      !value ||
      (size !== undefined && value.length !== size) ||
      (await hash256(value)) !== expectedHash
    )
      throw new Error(
        `Falha de integridade (hash) em ${path}. A cópia não foi importada.`,
      );
    return value;
  };
  const draftValue: unknown = JSON.parse(
    decoder.decode(await requireBytes("draft.json", manifest.draft.sha256)),
  );
  const result = validateDraft(draftValue);
  if (!result.valid)
    throw new Error(
      `Curso inválido na cópia: ${result.issues[0]?.message ?? "contrato inválido"}`,
    );
  const presetValue: unknown = JSON.parse(
    decoder.decode(await requireBytes("presets.json", manifest.presets.sha256)),
  );
  const parsedPresets = presetsSchema.safeParse(presetValue);
  if (!parsedPresets.success)
    throw new Error(
      "Presets inválidos. Credenciais não pertencem ao projeto portátil.",
    );
  const restoreFiles = async (
    items: z.infer<typeof fileSchema>[],
    directory: string,
  ): Promise<ProjectFile[]> =>
    Promise.all(
      items.map(async (entry) => {
        if (
          entry.path !== `${directory}/${entry.id}.bin` ||
          usedPaths.has(entry.path)
        )
          throw new Error("Caminho interno inválido ou repetido no projeto.");
        usedPaths.add(entry.path);
        return {
          id: entry.id,
          name: entry.name,
          mediaType: entry.mediaType,
          bytes: await requireBytes(entry.path, entry.sha256, entry.size),
        };
      }),
    );
  const assets = await restoreFiles(manifest.assets, "assets");
  const sources = await restoreFiles(manifest.sources, "sources");
  const provenance = manifest.provenance
    ? projectProvenanceSchema.parse(
        JSON.parse(
          decoder.decode(
            await requireBytes("provenance.json", manifest.provenance.sha256),
          ),
        ),
      )
    : undefined;
  if (manifest.provenance) usedPaths.add("provenance.json");
  if ([...entries.keys()].some((path) => !usedPaths.has(path)))
    throw new Error("O pacote contém arquivos não declarados no manifesto.");
  const project: CourseProject = {
    version: 1,
    projectId: manifest.projectId ?? projectIdentity({ draft: result.draft }),
    draft: result.draft,
    assets,
    sources,
    presets: parsedPresets.data as ProjectPreset[],
    profiles: manifest.profiles,
    ...(provenance ? { provenance } : {}),
  };
  validateProject(project);
  return project;
}
