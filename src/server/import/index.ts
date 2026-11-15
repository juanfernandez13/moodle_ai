import { z } from "zod";
import { validateDraft } from "../../domain/course/index.ts";
import { hash256, ArchiveError } from "../../shared/archive.ts";
import {
  UPLOAD_MESSAGES,
  formatMegabytes,
} from "../../shared/upload-limits.ts";
import { extractDocument } from "./documents.ts";
import { interpretOffline } from "./offline.ts";
import {
  interpretWithProvider,
  promptVersionFor,
  repairRequest,
} from "./providers.ts";
import { assignTargets, shapeQuizPackage } from "./quiz-package.ts";
import {
  IMPORT_LIMITS,
  ImportError,
  abortIfNeeded,
  issue,
  blockText,
  type DocumentInput,
  type ExtractedDocument,
  type ImportDependencies,
  type ImportIssue,
  type ImportMode,
  type ImportPreview,
  type ImportProfile,
  type ImportProvenance,
  type ImportProvider,
  type ImportResult,
  type PortableFile,
  type RepairRequest,
} from "./types.ts";

export { IMPORT_LIMITS, extractDocument };
export { buildImportPrompt } from "./providers.ts";
export type {
  ImportResult,
  ImportIssue,
  ImportPreview,
  ImportProvenance,
  ImportProfile,
  ImportProvider,
  ImportMode,
  PortableFile,
  DocumentInput,
  ImportDependencies,
} from "./types.ts";
const profile = z.enum(["docx-topicos-v1", "docx-semanal-v1"]);
const provider = z.enum(["offline", "gemini", "openai", "claude", "custom"]);
const options = {
  profile,
  provider,
  apiKey: z.string().max(2000).optional(),
  model: z.string().min(1).max(200).optional(),
  // Só a "Outra IA" tem endereço próprio; as demais já o têm (src/shared/ai-providers.ts).
  baseUrl: z.string().min(1).max(500).optional(),
};
/** O endereço de outra IA não vale para uma IA que já tem o seu: seria um jeito de desviar a chamada. */
function misplacedBaseUrl(input: {
  provider: ImportProvider;
  baseUrl?: string | undefined;
}): ImportResult | null {
  if (input.baseUrl === undefined || input.provider === "custom") return null;
  return {
    ok: false,
    issues: [
      issue(
        "invalid_import_input",
        "O endereço só vale para a Outra IA.",
        "baseUrl",
      ),
    ],
  };
}
const interpretSchema = z.strictObject({
  text: z.string().min(1).max(IMPORT_LIMITS.maxTextCharacters),
  ...options,
});
const documentSchema = z.strictObject({
  id: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/),
  name: z.string().min(1).max(200),
  mediaType: z.string().max(200),
  bytes: z.custom<Uint8Array>((value) => value instanceof Uint8Array),
});
const documentsSchema = z.strictObject({
  files: z.array(documentSchema).min(1).max(IMPORT_LIMITS.maxFiles),
  ...options,
  // course (padrão): o planejamento vira um curso. quizzes: cada arquivo é um quiz para mesclar num curso que já existe.
  mode: z.enum(["course", "quizzes"]).optional(),
});
function invalidInput(error: z.ZodError): ImportResult {
  return {
    ok: false,
    issues: error.issues.map((problem) =>
      issue(
        problem.code === "unrecognized_keys"
          ? "unknown_field"
          : "invalid_import_input",
        problem.path.join(".") === "files" &&
          (problem.code === "too_big" || problem.code === "too_small")
          ? UPLOAD_MESSAGES.fileCount
          : "Confira os campos, perfil, provedor e limites da importação.",
        problem.path.join(".") || "$",
      ),
    ),
  };
}
function controlledError(
  error: unknown,
  preview?: ImportPreview[],
): ImportResult {
  const problem =
    error instanceof ImportError || error instanceof ArchiveError
      ? issue(error.code, error.message)
      : issue(
          "import_failed",
          "Não foi possível interpretar o documento. Confira o formato e tente novamente.",
        );
  return { ok: false, issues: [problem], ...(preview ? { preview } : {}) };
}
// First limit the documents break together, in words a teacher can act on.
function batchLimitProblem(documents: ExtractedDocument[]): string | null {
  const assets = documents.flatMap((document) => document.assets);
  const characters = documents.reduce(
    (total, document) =>
      total +
      document.blocks.reduce((sum, block) => sum + blockText(block).length, 0),
    0,
  );
  if (characters > IMPORT_LIMITS.maxTextCharacters)
    return `O texto dos documentos juntos passa de ${IMPORT_LIMITS.maxTextCharacters.toLocaleString("pt-BR")} caracteres. Divida a importação.`;
  if (assets.length > IMPORT_LIMITS.maxAssets)
    return `Os documentos juntos têm mais de ${IMPORT_LIMITS.maxAssets} imagens. Divida a importação.`;
  if (
    assets.reduce((total, asset) => total + asset.bytes.length, 0) >
    IMPORT_LIMITS.maxArchiveTotalBytes
  )
    return `As imagens dos documentos juntos passam de ${formatMegabytes(IMPORT_LIMITS.maxArchiveTotalBytes)}. Divida a importação.`;
  return null;
}
const portable = (input: DocumentInput): PortableFile => ({
  id: input.id,
  name: input.name,
  mediaType: input.mediaType,
  base64: Buffer.from(input.bytes).toString("base64"),
});
function imageOccurrences(
  value: unknown,
): { id: string; attachmentId: string }[] {
  if (Array.isArray(value)) return value.flatMap(imageOccurrences);
  if (typeof value !== "object" || value === null) return [];
  const object = value as Record<string, unknown>;
  if (
    object.kind === "image" &&
    typeof object.id === "string" &&
    typeof object.attachmentId === "string"
  )
    return [{ id: object.id, attachmentId: object.attachmentId }];
  return Object.values(object).flatMap(imageOccurrences);
}
// Só quizzes: a IA transcreve um quiz por documento e o código decide a seção de destino de cada um.
async function interpretQuizzes(
  documents: ExtractedDocument[],
  selectedProfile: ImportProfile,
  selectedProvider: ImportProvider,
  dependencies: ImportDependencies,
  targets: readonly number[],
  repair?: RepairRequest,
) {
  if (selectedProvider === "offline")
    throw new ImportError(
      "quiz_package_requires_ai",
      "Só quizzes precisa de uma IA. Escolha uma IA para ler os arquivos.",
    );
  const raw = await interpretWithProvider(
    documents,
    selectedProfile,
    selectedProvider,
    dependencies,
    "quizzes",
    repair,
  );
  try {
    return {
      ...shapeQuizPackage(raw.candidate, raw.fields, documents, targets),
      model: raw.model,
      text: raw.text,
    };
  } catch (error) {
    // Uma seção por arquivo é o que se pediu à IA: se não veio assim, ela é chamada a corrigir.
    if (error instanceof ImportError && error.code === "quiz_package_shape")
      throw new ImportError(
        error.code,
        error.message,
        repairRequest(raw.text, [
          `Devolva exatamente ${documents.length} seções, uma por documento, na mesma ordem em que os documentos chegaram, cada uma com exatamente uma atividade do tipo quiz.`,
        ]),
      );
    throw error;
  }
}

// Quantas vezes a resposta volta à IA para ela corrigir, antes de desistir. Cada volta é uma chamada a mais.
const MAX_REPAIRS = 2;
const problemLines = (issues: readonly ImportIssue[]): string[] =>
  issues
    .filter((problem) => problem.severity === "error")
    .map((problem) => `${problem.path}: ${problem.message}`);

async function interpretExtracted(
  documents: ExtractedDocument[],
  selectedProfile: ImportProfile,
  selectedProvider: ImportProvider,
  dependencies: ImportDependencies,
  selectedMode: ImportMode = "course",
  targets: readonly number[] = [],
): Promise<ImportResult> {
  const preview = documents.map((document) => ({
    sourceId: document.id,
    name: document.name,
    blocks: document.blocks,
  }));
  try {
    abortIfNeeded(dependencies.signal);
    const extractionIssues = documents.flatMap((document) => document.issues);
    if (extractionIssues.some((problem) => problem.severity === "error"))
      return { ok: false, issues: extractionIssues, preview };
    // O que a IA devolve nunca é aplicado sem passar pela validação. Se não passar, a resposta volta à IA com a lista
    // do que está errado (até MAX_REPAIRS vezes); se continuar errada, o erro vai para a tela e nada é aplicado.
    let repair: RepairRequest | undefined;
    for (let attempt = 0; ; attempt++) {
      let interpreted;
      try {
        interpreted =
          selectedMode === "quizzes"
            ? await interpretQuizzes(
                documents,
                selectedProfile,
                selectedProvider,
                dependencies,
                targets,
                repair,
              )
            : selectedProvider === "offline"
              ? interpretOffline(documents, selectedProfile)
              : await interpretWithProvider(
                  documents,
                  selectedProfile,
                  selectedProvider,
                  dependencies,
                  "course",
                  repair,
                );
      } catch (error) {
        if (error instanceof ImportError && error.repair && attempt < MAX_REPAIRS) {
          repair = error.repair;
          continue;
        }
        throw error;
      }
      const result = verifyInterpretation(
        documents,
        preview,
        extractionIssues,
        interpreted,
        selectedProfile,
        selectedProvider,
        selectedMode,
        dependencies,
      );
      if (result.ok || attempt >= MAX_REPAIRS || !("text" in interpreted))
        return result;
      repair = repairRequest(interpreted.text, problemLines(result.issues));
      if (!repair) return result;
    }
  } catch (error) {
    return controlledError(error, preview);
  }
}

type Interpreted = {
  candidate: unknown;
  fields: ImportProvenance["fields"];
  model?: string;
  issues?: ImportIssue[];
};
/** Confere o que a IA (ou o leitor sem IA) devolveu contra o contrato e contra os documentos recebidos. */
function verifyInterpretation(
  documents: ExtractedDocument[],
  preview: ImportPreview[],
  extractionIssues: ImportIssue[],
  interpreted: Interpreted,
  selectedProfile: ImportProfile,
  selectedProvider: ImportProvider,
  selectedMode: ImportMode,
  dependencies: ImportDependencies,
): ImportResult {
    const validation = validateDraft(interpreted.candidate);
    const issues = [
      ...extractionIssues,
      ...(interpreted.issues ?? []),
      ...(!validation.valid ? validation.issues : []),
    ];
    if (
      !validation.valid ||
      issues.some((problem) => problem.severity === "error")
    )
      return { ok: false, issues, preview };
    const images = imageOccurrences(validation.draft),
      expectedImages = documents.flatMap((document) =>
        imageOccurrences(document.blocks),
      );
    if (
      expectedImages.some(
        (image) =>
          !images.some(
            (candidate) =>
              candidate.id === image.id &&
              candidate.attachmentId === image.attachmentId,
          ),
      ) ||
      images.some(
        (image) =>
          !expectedImages.some(
            (expected) =>
              expected.id === image.id &&
              expected.attachmentId === image.attachmentId,
          ),
      )
    ) {
      return {
        ok: false,
        issues: [
          ...issues,
          issue(
            "image_occurrence_mismatch",
            "Uma ocorrência de imagem perdeu seu vínculo ou não tem origem conhecida. Confira os destinos antes de continuar.",
          ),
        ],
        preview,
      };
    }
    const assets = documents.flatMap((document) => document.assets);
    if (
      validation.draft.attachments.length !== assets.length ||
      validation.draft.attachments.some(
        (attachment) =>
          !assets.some(
            (asset) =>
              asset.id === attachment.id &&
              asset.name === attachment.name &&
              asset.bytes.length === attachment.size &&
              asset.mediaType === attachment.mediaType,
          ),
      )
    ) {
      return {
        ok: false,
        issues: [
          ...issues,
          issue(
            "attachment_mismatch",
            "A proposta não preserva os arquivos extraídos. Confira os anexos antes de continuar.",
          ),
        ],
        preview,
      };
    }
    abortIfNeeded(dependencies.signal);
    return {
      ok: true,
      draft: validation.draft,
      assets: assets.map(portable),
      sources: documents.map(portable),
      issues,
      preview,
      provenance: {
        profile: selectedProfile,
        provider: selectedProvider,
        ...(interpreted.model !== undefined ? { model: interpreted.model } : {}),
        promptVersion: promptVersionFor(selectedMode),
        schemaVersion: 1,
        fields: interpreted.fields,
      },
    };
}

export async function importDocuments(
  input: unknown,
  dependencies: ImportDependencies = {},
): Promise<ImportResult> {
  const parsed = documentsSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const misplaced = misplacedBaseUrl(parsed.data);
  if (misplaced) return misplaced;
  if (
    new Set(parsed.data.files.map((file) => file.id)).size !==
    parsed.data.files.length
  )
    return {
      ok: false,
      issues: [
        issue(
          "duplicate_source_id",
          "Cada documento precisa ter uma identidade própria.",
        ),
      ],
    };
  if (
    parsed.data.files.reduce((total, file) => total + file.bytes.length, 0) >
    IMPORT_LIMITS.maxTotalBytes
  )
    return {
      ok: false,
      issues: [issue("total_upload_limit", UPLOAD_MESSAGES.totalSize)],
    };
  const documents: ExtractedDocument[] = [];
  // Só quizzes: os arquivos seguem para a IA na ordem das seções de destino, e é essa ordem que liga cada seção ao arquivo.
  const placed =
    parsed.data.mode === "quizzes"
      ? assignTargets(parsed.data.files)
      : undefined;
  try {
    for (const file of placed?.map((item) => item.file) ?? parsed.data.files)
      documents.push(await extractDocument(file, dependencies.signal));
    const tooMuch = batchLimitProblem(documents);
    if (tooMuch) throw new ImportError("document_content_limit", tooMuch);
    return await interpretExtracted(
      documents,
      parsed.data.profile,
      parsed.data.provider,
      {
        ...dependencies,
        ...(parsed.data.apiKey !== undefined
          ? { apiKey: parsed.data.apiKey }
          : {}),
        ...(parsed.data.model !== undefined
          ? { model: parsed.data.model }
          : {}),
        ...(parsed.data.baseUrl !== undefined
          ? { baseUrl: parsed.data.baseUrl }
          : {}),
      },
      parsed.data.mode ?? "course",
      placed?.map((item) => item.target),
    );
  } catch (error) {
    return controlledError(
      error,
      documents.map((document) => ({
        sourceId: document.id,
        name: document.name,
        blocks: document.blocks,
      })),
    );
  }
}

export async function interpretText(
  input: unknown,
  dependencies: ImportDependencies = {},
): Promise<ImportResult> {
  const parsed = interpretSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  try {
    const bytes = new TextEncoder().encode(parsed.data.text),
      id = `source-${(await hash256(bytes)).slice(0, 16)}`;
    return await importDocuments(
      {
        files: [
          { id, name: "planejamento.txt", mediaType: "text/plain", bytes },
        ],
        profile: parsed.data.profile,
        provider: parsed.data.provider,
        ...(parsed.data.apiKey !== undefined
          ? { apiKey: parsed.data.apiKey }
          : {}),
        ...(parsed.data.model !== undefined
          ? { model: parsed.data.model }
          : {}),
        ...(parsed.data.baseUrl !== undefined
          ? { baseUrl: parsed.data.baseUrl }
          : {}),
      },
      dependencies,
    );
  } catch (error) {
    return controlledError(error);
  }
}
