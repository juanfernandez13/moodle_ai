import { createHash } from "node:crypto";
import {
  validateDraft,
  type ValidationIssue,
} from "../../domain/course/index.ts";
import { ExportModel } from "./model.ts";
import {
  profileIssues,
  issue,
  EXPORT_LIMITS,
  PROFILE_VALIDATION,
} from "./profile.ts";
import { buildBackup } from "./builders.ts";
import { packageArchive } from "./archive.ts";

export { EXPORT_LIMITS, PROFILE_VALIDATION } from "./profile.ts";
export interface ExportOptions {
  profileId: "moodle-4.1-core-v1";
  resolveAttachment: (id: string) => Promise<Uint8Array | null>;
  signal?: AbortSignal;
}
export interface ExportWarning {
  code: string;
  path: string;
  severity: "warning";
  message: string;
}
export type ExportResult =
  | {
      ok: true;
      revision: number;
      profileId: "moodle-4.1-core-v1";
      artifact: {
        filename: string;
        mediaType: "application/gzip";
        bytes: Uint8Array;
        sha256: string;
      };
      warnings: ExportWarning[];
    }
  | { ok: false; issues: ValidationIssue[] };
const abortIssue = () => ({
  ok: false as const,
  issues: [issue("export_cancelled", "$", "A exportação foi cancelada.")],
});
async function resolveWithAbort(
  resolver: () => Promise<Uint8Array | null>,
  signal: AbortSignal | undefined,
): Promise<Uint8Array | null> {
  if (signal === undefined) return resolver();
  if (signal.aborted) throw new Error("cancelled");
  let stop: () => void = () => {};
  const cancelled = new Promise<never>((_, reject) => {
    stop = () => reject(new Error("cancelled"));
    signal.addEventListener("abort", stop, { once: true });
  });
  try {
    return await Promise.race([resolver(), cancelled]);
  } finally {
    signal.removeEventListener("abort", stop);
  }
}
export async function exportCourse(
  input: unknown,
  options: ExportOptions,
): Promise<ExportResult> {
  if (options.signal?.aborted) return abortIssue();
  if (options.profileId !== "moodle-4.1-core-v1")
    return {
      ok: false,
      issues: [
        issue(
          "unsupported_profile",
          "profileId",
          "Escolha o perfil Moodle disponível.",
        ),
      ],
    };
  const validation = validateDraft(input);
  if (!validation.valid) return { ok: false, issues: validation.issues };
  const problems = profileIssues(validation.draft);
  if (problems.length) return { ok: false, issues: problems };
  const resolved = new Map<string, Uint8Array>();
  let total = 0;
  for (const [index, ref] of validation.draft.attachments.entries()) {
    if (options.signal?.aborted) return abortIssue();
    try {
      const bytes = await resolveWithAbort(
        () => options.resolveAttachment(ref.id),
        options.signal,
      );
      if (options.signal?.aborted) return abortIssue();
      if (!(bytes instanceof Uint8Array))
        return {
          ok: false,
          issues: [
            issue(
              "missing_attachment",
              `attachments[${index}]`,
              "Forneça os bytes do anexo antes de exportar.",
            ),
          ],
        };
      if (bytes.byteLength !== ref.size)
        return {
          ok: false,
          issues: [
            issue(
              "attachment_size_mismatch",
              `attachments[${index}].size`,
              "O tamanho dos bytes não corresponde ao anexo declarado.",
            ),
          ],
        };
      total += bytes.byteLength;
      if (
        bytes.byteLength > EXPORT_LIMITS.fileBytes ||
        total > EXPORT_LIMITS.attachmentBytes
      )
        return {
          ok: false,
          issues: [
            issue(
              "attachments_too_large",
              "attachments",
              "Os anexos ultrapassam os limites de exportação.",
            ),
          ],
        };
      resolved.set(ref.id, new Uint8Array(bytes));
    } catch {
      if (options.signal?.aborted) return abortIssue();
      return {
        ok: false,
        issues: [
          issue(
            "attachment_unavailable",
            `attachments[${index}]`,
            "Não foi possível obter os bytes do anexo. Tente novamente.",
          ),
        ],
      };
    }
  }
  try {
    if (options.signal?.aborted) return abortIssue();
    const model = new ExportModel(validation.draft, resolved);
    const entries = buildBackup(model);
    // Um mesmo destino Moodle não pode ter dois conteúdos sob o mesmo nome.
    const names = new Map<string, string>();
    for (const file of model.files) {
      const key = `${file.context}:${file.component}:${file.area}:${file.item}:${file.attachment.name}`;
      const existing = names.get(key);
      if (existing !== undefined && existing !== file.attachment.id)
        return {
          ok: false,
          issues: [
            issue(
              "duplicate_filename",
              "attachments",
              "Anexos distintos com o mesmo destino precisam ter nomes diferentes.",
            ),
          ],
        };
      names.set(key, file.attachment.id);
    }
    const bytes = packageArchive(entries, model.now);
    const warnings: ExportWarning[] = [
      {
        code: "lab_validated",
        path: "$",
        severity: "warning",
        message: `Perfil verificado por restauração e comparação semântica de fixtures no Moodle Lab local ${PROFILE_VALIDATION.release} (Build: ${PROFILE_VALIDATION.build}). A evidência não abrange outras versões, plugins ou instâncias.`,
      },
    ];
    if (
      model.activities.some(
        (activity) =>
          activity.source.type === "glossary" &&
          activity.source.entries.length > 0,
      )
    )
      warnings.push({
        code: "glossary_restore_setting",
        path: "sections",
        severity: "warning",
        message:
          "Para preservar as entradas editoriais do glossário, mantenha informação de usuário ativada na restauração. O pacote não contém contas, matrículas ou submissões; as entradas não possuem autor.",
      });
    return {
      ok: true,
      revision: validation.draft.revision,
      profileId: options.profileId,
      artifact: {
        filename: `moodle-${validation.draft.id}.mbz`,
        mediaType: "application/gzip",
        bytes,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      },
      warnings,
    };
  } catch {
    return {
      ok: false,
      issues: [
        issue(
          "export_failed",
          "$",
          "Não foi possível concluir o pacote dentro dos limites de exportação.",
        ),
      ],
    };
  }
}
