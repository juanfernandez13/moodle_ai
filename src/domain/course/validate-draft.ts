import { courseDraftSchema, type CourseDraft } from './schema.ts';
import { validateDomainRules } from './rules.ts';

export interface ValidationIssue {
  code: string;
  path: string;
  severity: 'error';
  message: string;
}

export type ValidationResult =
  | { valid: true; draft: CourseDraft; issues: [] }
  | { valid: false; issues: ValidationIssue[] };

function fieldPath(parts: readonly PropertyKey[]): string {
  return parts.reduce<string>((path, part) => {
    if (typeof part === 'number') return `${path}[${part}]`;
    const name = typeof part === 'string' && /^[A-Za-z_$][\w$]*$/.test(part) ? part : '[campo desconhecido]';
    return path ? `${path}.${name}` : name;
  }, '') || '$';
}

export function validateDraft(input: unknown): ValidationResult {
  const parsed = courseDraftSchema.safeParse(input);
  if (!parsed.success) {
    return {
      valid: false,
      issues: parsed.error.issues.flatMap((issue): ValidationIssue[] => {
        if (issue.code === 'unrecognized_keys') {
          return issue.keys.map((key) => ({
            code: 'unknown_field', path: fieldPath([...issue.path, key]), severity: 'error',
            message: 'Este campo não faz parte do contrato público do rascunho.',
          }));
        }
        const messages: Record<string, string> = {
          invalid_type: 'Informe um valor do tipo exigido pelo contrato.',
          invalid_value: 'O valor não é aceito por esta versão do contrato.',
          invalid_union: 'Informe um tipo de atividade aceito por esta versão do contrato.',
          invalid_format: 'O campo deve respeitar o formato definido no contrato.',
          too_small: 'O campo não alcança o mínimo definido no contrato.',
          too_big: 'O campo excede o limite definido no contrato.',
          custom: 'O campo deve conter texto que não seja somente espaços.',
        };
        return [{
          code: issue.code, path: fieldPath(issue.path), severity: 'error',
          message: issue.code === 'custom' && issue.path.at(-1) === 'schedule'
            ? 'Informe pelo menos uma data de abertura ou fechamento.'
            : messages[issue.code] ?? 'O campo não atende ao contrato do rascunho.',
        }];
      }),
    };
  }
  const issues = validateDomainRules(parsed.data);
  if (issues.length > 0) return { valid: false, issues };
  return { valid: true, draft: parsed.data, issues: [] };
}
