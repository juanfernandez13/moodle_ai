import { validateDraft } from "../domain/course/index.ts";
import { UPLOAD_LIMITS, UPLOAD_MESSAGES } from "../shared/upload-limits.ts";
import { validateProvenance } from "./provenance.ts";
import type { ProjectProvenance } from "./provenance.ts";
import type {
  CourseDraft,
  Activity,
  Question,
  Section,
} from "../domain/course/index.ts";

export interface ProjectFile {
  id: string;
  name: string;
  mediaType: string;
  bytes: Uint8Array;
}
// Attachments (assets) go into the Moodle backup, so they follow its limits:
// 16 MiB each, 64 MiB in all. Sources are the documents the teacher imported
// and follow the upload limits; they never go into the backup.
export const PROJECT_FILE_LIMITS = Object.freeze({
  attachmentBytes: 16 * 1024 * 1024,
  attachmentsTotalBytes: 64 * 1024 * 1024,
  sourceBytes: UPLOAD_LIMITS.maxFileBytes,
  sourcesTotalBytes: UPLOAD_LIMITS.maxTotalBytes,
});
export interface ProjectPreset {
  id: string;
  name: string;
  organization?: "topics" | "weeks";
  gradebook?: CourseDraft["gradebook"];
}
export interface CourseProject {
  version: 1;
  projectId?: string | undefined;
  draft: CourseDraft;
  assets: ProjectFile[];
  sources: ProjectFile[];
  presets: ProjectPreset[];
  provenance?: ProjectProvenance | undefined;
  profiles: {
    importProfile: "docx-topicos-v1" | "docx-semanal-v1";
    provider: "offline" | "openai" | "gemini";
    pedagogy: string;
    compatibility: "moodle-4.1-core-v1";
  };
}
export function newId(prefix = "item"): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
// Legacy copies keep one stable identity; new workspaces never use course IDs as keys.
export function projectIdentity(
  project: Pick<CourseProject, "projectId" | "draft">,
): string {
  return project.projectId ?? `legacy-${project.draft.id}`;
}
export function createProject(
  name = "Minha disciplina",
  firstSection = "Unidade 1",
): CourseProject {
  return {
    version: 1,
    projectId: newId("project"),
    draft: {
      schemaVersion: 1,
      id: newId("course"),
      revision: 0,
      metadata: {
        fullName: name,
        shortName: "CURSO",
        summary: "",
        organization: "topics",
      },
      sections: [
        {
          id: newId("section"),
          title: firstSection,
          summary: "",
          activities: [],
        },
      ],
      attachments: [],
    },
    assets: [],
    sources: [],
    presets: [],
    profiles: {
      importProfile: "docx-topicos-v1",
      provider: "offline",
      pedagogy: "personalizado",
      compatibility: "moodle-4.1-core-v1",
    },
  };
}
export function makeSection(position: number): Section {
  return {
    id: newId("section"),
    title: `Unidade ${position}`,
    summary: "",
    activities: [],
  };
}
export const activityLabels: Record<string, string> = {
  forum: "Fórum",
  assignment: "Tarefa",
  quiz: "Quiz",
  chat: "Chat",
  wiki: "Wiki",
  glossary: "Glossário",
};
export function makeQuestion(type = "multiple-choice"): Question {
  const common = {
    id: newId("question"),
    type,
    statement: "Enunciado da questão",
    feedback: "",
  };
  const value =
    type === "multiple-choice"
      ? {
          ...common,
          options: [
            {
              id: newId("option"),
              text: "Alternativa correta",
              fraction: 1,
              feedback: "",
            },
            {
              id: newId("option"),
              text: "Outra alternativa",
              fraction: 0,
              feedback: "",
            },
          ],
        }
      : type === "matching"
        ? {
            ...common,
            pairs: [
              {
                id: newId("pair"),
                statement: "Afirmação 1",
                answer: "Verdadeiro",
              },
              { id: newId("pair"), statement: "Afirmação 2", answer: "Falso" },
            ],
          }
        : {
            ...common,
            settings: {
              responseFormat: "editor",
              responseRequired: true,
              responseLines: 10,
              attachments: 0,
            },
          };
  return value as Question;
}
export function makeActivity(type: string): Activity {
  const common = {
    id: newId("activity"),
    type,
    title: `${activityLabels[type] ?? "Atividade"}: novo conteúdo`,
    description: "",
    attachmentIds: [],
  };
  const settings =
    type === "forum"
      ? { discussionMode: "general" }
      : type === "assignment"
        ? { maxGrade: 10, submissionMode: "file" }
        : type === "quiz"
          ? { maxGrade: 10, attempts: 1, shuffleQuestions: false }
          : type === "chat"
            ? { repeat: "none", keepDays: 30 }
            : type === "wiki"
              ? { mode: "collaborative", firstPageTitle: "Página inicial" }
              : {
                  allowDuplicates: false,
                  requireApproval: true,
                  entriesPerPage: 10,
                };
  return {
    ...common,
    settings,
    ...(type === "quiz" ? { questions: [makeQuestion()] } : {}),
    ...(type === "glossary" ? { entries: [] } : {}),
  } as Activity;
}
export function validateProject(project: CourseProject): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,199}$/.test(projectIdentity(project)))
    throw new Error("Identificador do projeto inválido.");
  const result = validateDraft(project.draft);
  if (!result.valid)
    throw new Error(
      `O curso tem pendências: ${result.issues[0]?.message ?? "contrato inválido"}`,
    );
  const ids = new Set<string>();
  const groups = [
    {
      files: project.assets,
      fileBytes: PROJECT_FILE_LIMITS.attachmentBytes,
      totalBytes: PROJECT_FILE_LIMITS.attachmentsTotalBytes,
      fileMessage: "Cada anexo pode ter até 16 MB.",
      totalMessage: "Os anexos do curso podem somar até 64 MB.",
    },
    {
      files: project.sources,
      fileBytes: PROJECT_FILE_LIMITS.sourceBytes,
      totalBytes: PROJECT_FILE_LIMITS.sourcesTotalBytes,
      fileMessage: UPLOAD_MESSAGES.fileSize,
      totalMessage: UPLOAD_MESSAGES.totalSize,
    },
  ];
  for (const group of groups) {
    let total = 0;
    for (const file of group.files) {
      if (
        ids.has(file.id) ||
        !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(file.id)
      )
        throw new Error("Identificador de arquivo inválido ou repetido.");
      ids.add(file.id);
      if (file.bytes.length > group.fileBytes)
        throw new Error(group.fileMessage);
      total += file.bytes.length;
    }
    if (total > group.totalBytes) throw new Error(group.totalMessage);
  }
  validateProvenance(project);
  for (const attachment of project.draft.attachments) {
    const file = project.assets.find((entry) => entry.id === attachment.id);
    if (
      !file ||
      file.bytes.length !== attachment.size ||
      file.name !== attachment.name ||
      file.mediaType !== attachment.mediaType
    )
      throw new Error(`Anexo sem bytes correspondentes: ${attachment.name}.`);
  }
}
