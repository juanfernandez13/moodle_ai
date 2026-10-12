import type { CourseProject } from "../../project.ts";

// Preserve projects and queued browser saves across auxiliary routes.
// Provider credentials are deliberately excluded.
export const workspaceSession = {
  project: null as CourseProject | null,
  revisions: new Map<string, number>(),
  blocked: new Set<string>(),
  queue: Promise.resolve() as Promise<void>,
};
