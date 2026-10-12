import type { ContentBlock, CourseDraft } from "../../domain/course/index.ts";

export const IMPORT_LIMITS = Object.freeze({
  maxFiles: 10,
  maxFileBytes: 10 * 1024 * 1024,
  maxTotalBytes: 20 * 1024 * 1024,
  maxArchiveEntries: 2000,
  maxArchiveEntryBytes: 16 * 1024 * 1024,
  maxArchiveTotalBytes: 64 * 1024 * 1024,
  maxTextCharacters: 300_000,
  maxPdfPages: 200,
  maxAssets: 500,
  maxSourceBlocks: 2000,
  maxProviderResponseBytes: 2 * 1024 * 1024,
  timeoutMs: 60_000,
});
export type ImportProfile = "docx-topicos-v1" | "docx-semanal-v1";
export type ImportProvider = "offline" | "openai" | "gemini";
export interface ImportIssue {
  code: string;
  path: string;
  severity: "error" | "warning";
  message: string;
}
export interface PortableFile {
  id: string;
  name: string;
  mediaType: string;
  base64: string;
}
export interface ImportPreview {
  sourceId: string;
  name: string;
  blocks: ContentBlock[];
}
export interface ImportProvenance {
  profile: ImportProfile;
  provider: ImportProvider;
  model?: string;
  promptVersion: "moodle-import-v1";
  schemaVersion: 1;
  fields: { path: string; sourceId: string; blockId: string }[];
}
export type ImportResult =
  | {
      ok: true;
      draft: CourseDraft;
      assets: PortableFile[];
      sources: PortableFile[];
      issues: ImportIssue[];
      preview: ImportPreview[];
      provenance: ImportProvenance;
    }
  | { ok: false; issues: ImportIssue[]; preview?: ImportPreview[] };
export interface DocumentInput {
  id: string;
  name: string;
  mediaType: string;
  bytes: Uint8Array;
}
export interface ExtractedDocument extends DocumentInput {
  blocks: ContentBlock[];
  assets: DocumentInput[];
  issues: ImportIssue[];
}
export interface ImportDependencies {
  apiKey?: string;
  model?: string;
  fetch?: typeof fetch;
  signal?: AbortSignal;
  timeoutMs?: number;
}
export class ImportError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "ImportError";
    this.code = code;
  }
}
export const issue = (
  code: string,
  message: string,
  path = "$",
  severity: "error" | "warning" = "error",
): ImportIssue => ({ code, path, severity, message });
export function abortIfNeeded(signal?: AbortSignal): void {
  if (signal?.aborted)
    throw new ImportError(
      "cancelled",
      "A importação foi cancelada. Seu projeto anterior foi preservado.",
    );
}
export function blockText(block: ContentBlock): string {
  if (block.kind === "text") return block.text;
  if (block.kind === "image") return "";
  return block.rows
    .map((row) =>
      row
        .map((cell) => cell.blocks.map(blockText).filter(Boolean).join(" "))
        .join("\t"),
    )
    .join("\n");
}
