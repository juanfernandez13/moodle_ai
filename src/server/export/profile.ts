import type {
  CourseDraft,
  ValidationIssue,
} from "../../domain/course/index.ts";

export const EXPORT_LIMITS = {
  fileBytes: 16 * 1024 * 1024,
  attachmentBytes: 64 * 1024 * 1024,
  expandedBytes: 96 * 1024 * 1024,
} as const;
export const PROFILE_VALIDATION = {
  release: "4.1.17",
  build: "20250317",
  status: "lab-validated",
} as const;
export const issue = (
  code: string,
  path: string,
  message: string,
): ValidationIssue => ({ code, path, severity: "error", message });
export function profileIssues(draft: CourseDraft): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  function inspect(value: unknown, path: string): void {
    if (typeof value === "string") {
      if (
        /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/u.test(value) ||
        /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(
          value,
        )
      )
        issues.push(
          issue(
            "invalid_xml_character",
            path,
            "O texto contém um caractere que não pode ser preservado no XML Moodle.",
          ),
        );
      if (/(?:startDate|opensAt|closesAt|sessionAt)$/.test(path)) {
        const fraction = value.match(/\.(\d+)/)?.[1];
        if (fraction && /[1-9]/.test(fraction))
          issues.push(
            issue(
              "unsupported_time_precision",
              path,
              "O Moodle registra segundos inteiros; ajuste a data para essa precisão.",
            ),
          );
        if (Date.parse(value) <= 0)
          issues.push(
            issue(
              "unsupported_date",
              path,
              "O perfil Moodle exige datas posteriores ao início de 1970.",
            ),
          );
      }
    } else if (Array.isArray(value))
      value.forEach((item, index) => inspect(item, `${path}[${index}]`));
    else if (value && typeof value === "object")
      for (const [key, item] of Object.entries(value))
        inspect(item, path ? `${path}.${key}` : key);
  }
  inspect(draft, "");
  if (
    draft.metadata.organization === "weeks" &&
    draft.metadata.startDate === undefined
  )
    issues.push(
      issue(
        "missing_start_date",
        "metadata.startDate",
        "O formato semanal exige uma data inicial explícita.",
      ),
    );
  let total = 0;
  draft.attachments.forEach((ref, index) => {
    total += ref.size;
    if (ref.size > EXPORT_LIMITS.fileBytes)
      issues.push(
        issue(
          "attachment_too_large",
          `attachments[${index}].size`,
          "Cada anexo pode ter no máximo 16 MiB.",
        ),
      );
    if (/[\\/\u0000]/.test(ref.name) || ref.name === "." || ref.name === "..")
      issues.push(
        issue(
          "unsafe_filename",
          `attachments[${index}].name`,
          "O nome do anexo deve ser um nome simples, sem diretórios.",
        ),
      );
  });
  if (total > EXPORT_LIMITS.attachmentBytes)
    issues.push(
      issue(
        "attachments_too_large",
        "attachments",
        "A soma dos anexos pode ter no máximo 64 MiB.",
      ),
    );
  return issues;
}
