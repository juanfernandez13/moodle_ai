import type { CourseProject } from "../../project.ts";
import type { AiProvider, TabKeys } from "./hooks/use-course-import.ts";

// Preserve projects and queued browser saves across auxiliary routes.
// Provider keys stay only in this tab's memory (never in localStorage, sessionStorage or IndexedDB): they survive a
// move to Alunos or Datas and back, as the "Fica só nesta aba" note promises, and vanish when the tab reloads or closes.
export const workspaceSession = {
  project: null as CourseProject | null,
  keys: {} as TabKeys,
  provider: null as AiProvider | null,
  revisions: new Map<string, number>(),
  blocked: new Set<string>(),
  queue: Promise.resolve() as Promise<void>,
};
