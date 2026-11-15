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
interface ExecuteOptions {
  signal?: AbortSignal;
}
interface Tool {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint?: boolean };
  execute: (input: unknown, options?: ExecuteOptions) => Promise<unknown>;
}
interface ModelContext {
  // Não existe unregisterTool(): a ferramenta sai da página quando o sinal do registro é abortado.
  registerTool: (
    tool: Tool,
    options?: { signal?: AbortSignal },
  ) => void | Promise<void>;
}
interface Registration {
  users: number;
  context: ModelContext;
  controller?: AbortController;
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

/** O agente só recebe o que a ferramenta devolve: a mensagem de uma exceção não chega até ele. */
function readable(error: unknown): string {
  if (error instanceof z.ZodError)
    return `Entrada inválida: ${error.issues
      .map((issue) => `${issue.path.join(".") || "entrada"}: ${issue.message}`)
      .join("; ")}`;
  return error instanceof Error ? error.message : "Não foi possível concluir.";
}
function answering(
  run: (input: unknown) => unknown,
): (input: unknown, options?: ExecuteOptions) => Promise<unknown> {
  return async (input, options) => {
    try {
      return await run(input);
    } catch (error) {
      if (options?.signal?.aborted) throw error;
      return { error: readable(error) };
    }
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
      // Títulos e textos vêm dos arquivos que a pessoa importou: o agente deve tratá-los como dado, não como ordem.
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: answering(() => {
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
      }),
    },
    {
      name: "get_activity",
      description:
        "Ler uma atividade do projeto aberto sem caminhos ou credenciais.",
      inputSchema: {
        type: "object",
        properties: {
          activityId: {
            type: "string",
            description: "ID da atividade, como aparece no resumo do curso.",
          },
        },
        required: ["activityId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: answering((input) => {
        const parsed = z.strictObject({ activityId: z.string() }).parse(input);
        const activity = current()
          .draft.sections.flatMap((section) => section.activities)
          .find((entry) => entry.id === parsed.activityId);
        if (!activity) throw new Error("Atividade não encontrada.");
        return structuredClone(activity);
      }),
    },
    {
      name: "validate_course",
      description: "Validar a revisão solicitada sem modificar o curso.",
      inputSchema: {
        type: "object",
        properties: {
          expectedRevision: {
            type: "integer",
            description: "Revisão do curso lida no resumo mais recente.",
          },
        },
        required: ["expectedRevision"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: answering((input) => {
        const parsed = z
          .strictObject({ expectedRevision: z.number().int() })
          .parse(input);
        const project = current();
        if (parsed.expectedRevision !== project.draft.revision)
          return { error: "stale_revision" };
        return validateDraft(project.draft);
      }),
    },
    {
      name: "propose_course_changes",
      description:
        "Propor alterações de título e descrição por ID. A pessoa confere e aplica na interface.",
      inputSchema: {
        type: "object",
        properties: {
          expectedRevision: {
            type: "integer",
            description: "Revisão do curso lida no resumo mais recente.",
          },
          changes: {
            type: "array",
            description: "Uma entrada por atividade a alterar.",
            items: {
              type: "object",
              properties: {
                activityId: {
                  type: "string",
                  description:
                    "ID da atividade, como aparece no resumo do curso.",
                },
                title: { type: "string", description: "Novo título." },
                description: {
                  type: "string",
                  description: "Nova descrição, que substitui a atual.",
                },
              },
              required: ["activityId"],
              additionalProperties: false,
            },
          },
        },
        required: ["expectedRevision", "changes"],
        additionalProperties: false,
      },
      // Não altera o curso: abre a proposta na tela, e só a pessoa aplica.
      annotations: { readOnlyHint: false },
      execute: answering((input) => {
        const proposal = buildProposal(current(), input);
        registration.propose(proposal);
        return {
          status: "awaiting_user_review",
          revision: proposal.expectedRevision,
          changes: proposal.summary,
        };
      }),
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
      annotations: { readOnlyHint: true },
      execute: answering(() => {
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
      }),
    },
  ];
  const synchronize = () => {
    registration.queue = registration.queue
      .catch(() => {})
      .then(async () => {
        if (registration.users > 0) {
          const controller = (registration.controller ??=
            new AbortController());
          for (const tool of tools) {
            if (registration.names.has(tool.name)) continue;
            try {
              await context.registerTool(tool, { signal: controller.signal });
              registration.names.add(tool.name);
            } catch {
              // API opcional: a falha não tira nenhuma ação manual. Num navegador antigo, que ignora o sinal, o nome
              // repetido cai aqui e a ferramenta que já estava na página continua valendo, porque lê `registration`.
            }
          }
        } else {
          // Fora da tela do curso nenhuma ferramenta fica na página; a que sobrar num navegador antigo responde
          // "Abra um projeto".
          registration.getProject = () => null;
          registration.controller?.abort();
          delete registration.controller;
          registration.names.clear();
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
