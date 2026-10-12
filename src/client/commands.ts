import { validateDraft } from "../domain/course/index.ts";
import type { CourseDraft, Activity, Section } from "../domain/course/index.ts";

export type CourseCommand =
  | { type: "set_metadata"; metadata: CourseDraft["metadata"] }
  | { type: "add_section"; section: Section }
  | {
      type: "set_section";
      sectionId: string;
      title: string;
      summary: string;
      summaryBlocks?: Section["summaryBlocks"];
    }
  | { type: "remove_section"; sectionId: string }
  | { type: "move_section"; sectionId: string; to: number }
  | { type: "add_activity"; sectionId: string; activity: Activity }
  | { type: "set_activity"; activityId: string; activity: Activity }
  | { type: "remove_activity"; activityId: string }
  | { type: "move_activity"; activityId: string; to: number }
  | { type: "set_gradebook"; gradebook: CourseDraft["gradebook"] }
  | { type: "set_attachments"; attachments: CourseDraft["attachments"] };
export type CommandResult =
  | { ok: true; draft: CourseDraft }
  | { ok: false; code: "stale_revision" | "invalid_command"; message: string };

export function applyCommands(
  input: CourseDraft,
  expectedRevision: number,
  commands: CourseCommand[],
): CommandResult {
  if (expectedRevision !== input.revision)
    return {
      ok: false,
      code: "stale_revision",
      message: "O curso mudou. Recalcule a proposta sobre a revisão atual.",
    };
  const draft = structuredClone(input);
  try {
    if (commands.length > 100)
      throw new Error("Uma proposta pode ter até 100 alterações.");
    for (const command of commands) {
      const sectionId = "sectionId" in command ? command.sectionId : undefined;
      const section =
        sectionId === undefined
          ? undefined
          : draft.sections.find((entry) => entry.id === sectionId);
      const activityId =
        "activityId" in command ? command.activityId : undefined;
      const parent =
        activityId === undefined
          ? undefined
          : draft.sections.find((entry) =>
              entry.activities.some((activity) => activity.id === activityId),
            );
      const activityIndex =
        parent?.activities.findIndex((entry) => entry.id === activityId) ?? -1;
      switch (command.type) {
        case "set_metadata":
          draft.metadata = structuredClone(command.metadata);
          break;
        case "add_section":
          if (draft.sections.length >= 200)
            throw new Error("O curso admite até 200 unidades.");
          draft.sections.push(structuredClone(command.section));
          break;
        case "set_section":
          if (!section) throw new Error("Unidade não encontrada.");
          section.title = command.title;
          section.summary = command.summary;
          if (command.summaryBlocks !== undefined)
            section.summaryBlocks = structuredClone(command.summaryBlocks);
          break;
        case "remove_section":
          if (!section || draft.sections.length === 1)
            throw new Error("Mantenha pelo menos uma unidade.");
          draft.sections = draft.sections.filter(
            (entry) => entry.id !== sectionId,
          );
          break;
        case "move_section":
          if (
            !section ||
            !Number.isInteger(command.to) ||
            command.to < 0 ||
            command.to >= draft.sections.length
          )
            throw new Error("Destino da unidade inválido.");
          draft.sections.splice(draft.sections.indexOf(section), 1);
          draft.sections.splice(command.to, 0, section);
          break;
        case "add_activity":
          if (!section || section.activities.length >= 200)
            throw new Error(
              "Unidade ausente ou limite de atividades atingido.",
            );
          section.activities.push(structuredClone(command.activity));
          break;
        case "set_activity":
          if (
            !parent ||
            activityIndex < 0 ||
            command.activity.id !== activityId
          )
            throw new Error("A identidade da atividade deve ser preservada.");
          parent.activities[activityIndex] = structuredClone(command.activity);
          break;
        case "remove_activity":
          if (!parent || activityIndex < 0)
            throw new Error("Atividade não encontrada.");
          parent.activities.splice(activityIndex, 1);
          draft.gradebook?.categories.forEach((category) => {
            category.activityIds = category.activityIds.filter(
              (id) => id !== activityId,
            );
          });
          break;
        case "move_activity":
          if (
            !parent ||
            activityIndex < 0 ||
            !Number.isInteger(command.to) ||
            command.to < 0 ||
            command.to >= parent.activities.length
          )
            throw new Error("Destino da atividade inválido.");
          {
            const entry = parent.activities.splice(activityIndex, 1)[0]!;
            parent.activities.splice(command.to, 0, entry);
          }
          break;
        case "set_gradebook":
          if (command.gradebook === undefined) delete draft.gradebook;
          else draft.gradebook = structuredClone(command.gradebook);
          break;
        case "set_attachments":
          draft.attachments = structuredClone(command.attachments);
          break;
        default:
          throw new Error("Comando não reconhecido.");
      }
    }
    if (
      validateDraft(draft).issues.some(
        (issue) =>
          issue.code === "duplicate_id" || issue.code === "unknown_field",
      )
    )
      throw new Error(
        "A proposta contém identificadores repetidos ou campos internos.",
      );
    if (commands.length > 0) draft.revision += 1;
    return { ok: true, draft };
  } catch (error) {
    return {
      ok: false,
      code: "invalid_command",
      message: error instanceof Error ? error.message : "Proposta inválida.",
    };
  }
}
