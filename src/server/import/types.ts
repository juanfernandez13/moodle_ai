import type { ContentBlock, CourseDraft } from "../../domain/course/index.ts";
import type { AiProviderId } from "../../shared/ai-providers.ts";
import { UPLOAD_LIMITS } from "../../shared/upload-limits.ts";

export const IMPORT_LIMITS = Object.freeze({
  // What is sent: shared with the browser check and the project's source files.
  // next.config.ts proxyClientMaxBodySize must stay above maxTotalBytes.
  ...UPLOAD_LIMITS,
  // What is read from inside a DOCX. The entry and total byte limits match the
  // export limits (16 MiB per attachment, 64 MiB in all), so an image that is
  // imported can always be exported. A larger upload does not raise them.
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
export type ImportProvider = "offline" | AiProviderId;
/** course: o planejamento vira um curso inteiro; quizzes: só os quizzes, para mesclar num curso que já existe. */
export type ImportMode = "course" | "quizzes";
export type PromptVersion =
  | "moodle-import-v2"
  | "moodle-import-v3"
  | "moodle-quiz-import-v1"
  | "moodle-quiz-import-v2";
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
  // v2: o prompt manda a IA descobrir pelo documento se o curso é por tópicos ou por semanas (v1 seguia o perfil).
  promptVersion: PromptVersion;
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
  /** Só na "Outra IA": o endereço do serviço (as demais têm o delas). */
  baseUrl?: string;
  fetch?: typeof fetch;
  signal?: AbortSignal;
  timeoutMs?: number;
}
/** O que se devolve à IA para ela corrigir a resposta: o que ela escreveu e o que está errado nisso. */
export interface RepairRequest {
  previous: string;
  problems: string[];
}
export class ImportError extends Error {
  readonly code: string;
  /** Preenchido quando o erro é da resposta da IA (e não da conexão): dá para pedir a correção. Nunca vai à tela. */
  readonly repair: RepairRequest | undefined;
  constructor(code: string, message: string, repair?: RepairRequest) {
    super(message);
    this.name = "ImportError";
    this.code = code;
    this.repair = repair;
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
