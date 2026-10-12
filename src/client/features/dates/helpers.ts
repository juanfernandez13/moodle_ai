import type { DateTarget } from "../../../domain/dates/index.ts";

/** Missing targets use an explicitly fictitious local example. Domain validation follows. */
export function dateTargets(unitCount: number, text: string): DateTarget[] {
  if (text.trim()) return JSON.parse(text) as DateTarget[];
  return Array.from({ length: unitCount }, (_, sectionIndex) => [
    {
      id: `section-${sectionIndex + 1}`,
      kind: "section" as const,
      sectionIndex,
      title: `Unidade ${sectionIndex + 1}`
    },
    {
      id: `assignment-${sectionIndex + 1}`,
      kind: "assignment" as const,
      sectionIndex,
      title: `Tarefa da unidade ${sectionIndex + 1}`
    },
    {
      id: `quiz-${sectionIndex + 1}`,
      kind: "quiz" as const,
      sectionIndex,
      title: `Quiz da unidade ${sectionIndex + 1}`
    },
  ]).flat();
}

export function displayDate(value?: string): string {
  return value ? new Date(value).toLocaleString("pt-BR", { timeZone: "UTC" }) + " UTC" : "Sem data";
}

export function dateResultLabel(status: string): string {
  return ({
    applied: "Aplicado",
    error: "Erro",
    unknown: "Desconhecido",
    not_applied: "Não aplicado"
  } as Record<string, string>)[status] ?? status;
}
