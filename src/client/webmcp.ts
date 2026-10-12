import { z } from "zod";
import { courseDraftSchema } from "../domain/course/schema.ts";
import { validateDraft } from "../domain/course/index.ts";
import { applyCommands } from "./commands.ts";
import type { CourseCommand } from "./commands.ts";
import type { CourseProject } from "./project.ts";
import { projectIdentity } from "./project.ts";

const proposalSchema = z.strictObject({
  expectedRevision: z.number().int().min(0),
  changes: z
    .array(
      z
        .strictObject({
          activityId: z.string(),
          title: z.string().min(1).max(200).optional(),
          description: z.string().max(50_000).optional(),
        })
        .refine(
          (change) =>
            change.title !== undefined || change.description !== undefined,
          {
            message: "A proposta precisa alterar título ou descrição.",
          },
        ),
    )
    .min(1)
    .max(100)
    .refine(
      (changes) =>
        new Set(changes.map((change) => change.activityId)).size ===
        changes.length,
      {
        message: "Cada atividade deve aparecer somente uma vez na proposta.",
      },
    ),
});
interface Tool {
  name: string;
  description: string;
  inputSchema: object;
  execute: (input: unknown) => Promise<unknown>;
}
interface ModelContext {
  registerTool: (tool: Tool) => void | Promise<void>;
  unregisterTool?: (name: string) => void | Promise<void>;
}
interface Registration {
  users: number;
  context: ModelContext;
  names: Set<string>;
  queue: Promise<void>;
  getProject: () => CourseProject | null;
  propose: (proposal: CourseProposal) => void;
}
type BuilderDocument = Document & {
  modelContext?: ModelContext;
  __moodleAiRegistration?: Registration;
};
export interface CourseProposal {
  projectId: string;
  expectedRevision: number;
  commands: CourseCommand[];
  summary: string[];
}

export function buildProposal(
  project: CourseProject,
  input: unknown,
): CourseProposal {
  const parsed = proposalSchema.parse(input);
  if (parsed.expectedRevision !== project.draft.revision)
    throw new Error(
      "stale_revision: o curso mudou; solicite uma proposta nova.",
    );
  const commands = parsed.changes.map((change): CourseCommand => {
    const activity = project.draft.sections
      .flatMap((section) => section.activities)
      .find((entry) => entry.id === change.activityId);
    if (!activity) throw new Error("Atividade não encontrada no curso atual.");
    return {
      type: "set_activity",
      activityId: activity.id,
      activity: {
        ...structuredClone(activity),
        ...(change.title !== undefined ? { title: change.title } : {}),
        ...(change.description !== undefined
          ? { description: change.description }
          : {}),
      },
    };
  });
  const check = applyCommands(project.draft, parsed.expectedRevision, commands);
  if (!check.ok) throw new Error(check.message);
  if (!courseDraftSchema.safeParse(check.draft).success)
    throw new Error("A proposta não atende ao contrato do curso.");
  return {
    projectId: projectIdentity(project),
    expectedRevision: parsed.expectedRevision,
    commands,
    summary: parsed.changes.map(
      (change) =>
        `${change.activityId}: ${change.title ? `título → ${change.title}` : "descrição atualizada"}`,
    ),
  };
}

export function registerBuilderTools(
  getProject: () => CourseProject | null,
  propose: (proposal: CourseProposal) => void,
): () => void {
  const page = document as BuilderDocument;
  const context = page.modelContext;
  if (!context?.registerTool) return () => {};
  const registration = page.__moodleAiRegistration ?? {
    users: 0,
    context,
    names: new Set<string>(),
    queue: Promise.resolve(),
    getProject,
    propose,
  };
  page.__moodleAiRegistration = registration;
  registration.users++;
  registration.getProject = getProject;
  registration.propose = propose;
  const current = () => {
    const value = registration.getProject();
    if (!value) throw new Error("Abra um projeto antes de usar a ferramenta.");
    return value;
  };
  const tools: Tool[] = [
    {
      name: "get_course_summary",
      description: "Ler IDs, revisão, contagens e pendências do curso aberto.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      execute: async () => {
        const project = current();
        return {
          revision: project.draft.revision,
          metadata: project.draft.metadata,
          sections: project.draft.sections.map((section) => ({
            id: section.id,
            title: section.title,
            activities: section.activities.map((activity) => ({
              id: activity.id,
              type: activity.type,
              title: activity.title,
            })),
          })),
          issues: validateDraft(project.draft).issues,
        };
      },
    },
    {
      name: "get_activity",
      description:
        "Ler uma atividade do projeto aberto sem caminhos ou credenciais.",
      inputSchema: {
        type: "object",
        properties: { activityId: { type: "string" } },
        required: ["activityId"],
        additionalProperties: false,
      },
      execute: async (input) => {
        const parsed = z.strictObject({ activityId: z.string() }).parse(input);
        const activity = current()
          .draft.sections.flatMap((section) => section.activities)
          .find((entry) => entry.id === parsed.activityId);
        if (!activity) throw new Error("Atividade não encontrada.");
        return structuredClone(activity);
      },
    },
    {
      name: "validate_course",
      description: "Validar a revisão solicitada sem modificar o curso.",
      inputSchema: {
        type: "object",
        properties: { expectedRevision: { type: "integer" } },
        required: ["expectedRevision"],
        additionalProperties: false,
      },
      execute: async (input) => {
        const parsed = z
          .strictObject({ expectedRevision: z.number().int() })
          .parse(input);
        const project = current();
        if (parsed.expectedRevision !== project.draft.revision)
          return { error: "stale_revision" };
        return validateDraft(project.draft);
      },
    },
    {
      name: "propose_course_changes",
      description:
        "Propor alterações de título e descrição por ID. A pessoa confere e aplica na interface.",
      inputSchema: {
        type: "object",
        properties: {
          expectedRevision: { type: "integer" },
          changes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                activityId: { type: "string" },
                title: { type: "string" },
                description: { type: "string" },
              },
              required: ["activityId"],
              additionalProperties: false,
            },
          },
        },
        required: ["expectedRevision", "changes"],
        additionalProperties: false,
      },
      execute: async (input) => {
        const proposal = buildProposal(current(), input);
        registration.propose(proposal);
        return {
          status: "awaiting_user_review",
          revision: proposal.expectedRevision,
          changes: proposal.summary,
        };
      },
    },
    {
      name: "get_export_preview",
      description:
        "Ler revisão candidata, capacidades e bloqueios de exportação.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      execute: async () => {
        const project = current();
        return {
          revision: project.draft.revision,
          profile: project.profiles.compatibility,
          restoration: {
            status: "validated_lab",
            moodle: "4.1.17",
            build: "20250317",
            scope: "moodle-4.1-core-v1",
          },
          issues: validateDraft(project.draft).issues,
          attachments: project.draft.attachments.map((entry) => ({
            id: entry.id,
            available: project.assets.some(
              (asset) =>
                asset.id === entry.id && asset.bytes.length === entry.size,
            ),
          })),
        };
      },
    },
  ];
  const synchronize = () => {
    registration.queue = registration.queue
      .catch(() => {})
      .then(async () => {
        if (registration.users > 0) {
          for (const tool of tools) {
            if (registration.names.has(tool.name)) continue;
            // Clear registrations left by a previous development hot reload, if supported.
            try {
              await context.unregisterTool?.(tool.name);
            } catch {
              /* absent tools are harmless */
            }
            try {
              await context.registerTool(tool);
              registration.names.add(tool.name);
            } catch {
              /* optional API failure preserves all manual actions */
            }
          }
        } else {
          registration.getProject = () => null;
          for (const name of registration.names) {
            try {
              await context.unregisterTool?.(name);
            } catch {
              /* optional API may have been removed */
            }
          }
          if (context.unregisterTool) registration.names.clear();
        }
      });
  };
  synchronize();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    registration.users = Math.max(0, registration.users - 1);
    synchronize();
  };
}
