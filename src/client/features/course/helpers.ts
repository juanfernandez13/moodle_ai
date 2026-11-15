import { z } from "zod";
import { validateDraft } from "../../../domain/course/index.ts";
import { createProject, makeSection, makeActivity, makeQuestion, newId } from "../../project.ts";
import type { CourseProject } from "../../project.ts";
import type { UiIssue } from "./types.ts";
export const apiFile = z.strictObject({
  id: z.string(),
  name: z.string(),
  mediaType: z.string(),
  base64: z.string(),
});
export const safeIssue = z.strictObject({
  code: z.string(),
  path: z.string(),
  severity: z.enum(["error", "warning"]),
  message: z.string(),
});

/**
 * What goes in a banner: the message of each problem. The place is shown only when it names one (a field of the
 * course); "$" means the whole answer and says nothing to the person.
 */
export function issueLines(
  issues: readonly { path: string; message: string }[],
): string {
  return issues
    .map((issue) =>
      !issue.path || issue.path === "$"
        ? issue.message
        : `${issue.path}: ${issue.message}`,
    )
    .join("\n");
}

export function projectIssues(project: CourseProject): UiIssue[] {
  const issues: UiIssue[] = [...validateDraft(project.draft).issues];
  for (const attachment of project.draft.attachments) {
    if (
      !project.assets.some(
        (asset) =>
          asset.id === attachment.id && asset.bytes.length === attachment.size,
      )
    )
      issues.push({
        code: "missing_bytes",
        path: `attachments[${project.draft.attachments.indexOf(attachment)}]`,
        severity: "error",
        message: `Adicione os bytes do anexo “${attachment.name}” em Arquivos do projeto.`,
      });
  }
  return issues;
}

export function activitySummary(
  activities: CourseProject["draft"]["sections"][number]["activities"],
): string {
  const total = `${activities.length} ${activities.length === 1 ? "atividade" : "atividades"}`;
  const tasks = activities.filter((entry) => entry.type === "assignment").length;
  const quizzes = activities.filter((entry) => entry.type === "quiz").length;
  return [
    total,
    tasks > 0 ? `${tasks} ${tasks === 1 ? "tarefa" : "tarefas"}` : "",
    quizzes > 0 ? `${quizzes} ${quizzes === 1 ? "quiz" : "quizzes"}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

export function createExampleProject(): CourseProject {
  const next = createProject("Introdução à programação", "Primeiros passos");
  next.draft.metadata.shortName = "PROG-2026";
  next.draft.metadata.summary =
    "Uma disciplina de exemplo para explorar atividades, questões e revisão.";
  next.draft.sections.push(makeSection(2));
  next.draft.sections[1]!.title = "Praticar e construir";
  const named = (type: string, title: string) => ({
    ...makeActivity(type),
    title,
  });
  next.draft.sections[0]!.activities.push(
    named("forum", "Apresente-se à turma"),
    named("assignment", "Meu primeiro algoritmo"),
    named("quiz", "Repetição e decisão"),
    named("chat", "Plantão de dúvidas"),
    named("wiki", "Caderno da turma"),
    named("glossary", "Palavras da programação"),
  );
  const quiz = next.draft.sections[0]!.activities.find(
    (entry) => entry.type === "quiz",
  );
  if (quiz?.type === "quiz") {
    quiz.questions[0]!.statement =
      "Qual conceito permite repetir uma instrução?";
    quiz.questions.push(makeQuestion("matching"), makeQuestion("essay"));
  }
  next.draft.sections[1]!.activities.push(
    named("assignment", "Projeto da unidade"),
    named("quiz", "Revisão final"),
  );
  const bytes = new TextEncoder().encode(
    "Material de apoio fictício. Leia, pratique e revise seu algoritmo.",
  );
  const file = {
    id: newId("attachment"),
    name: "material-de-apoio.txt",
    mediaType: "text/plain",
    bytes,
  };
  next.assets.push(file);
  next.draft.attachments.push({
    id: file.id,
    name: file.name,
    mediaType: file.mediaType,
    size: bytes.length,
  });
  next.draft.sections[0]!.activities.find(
    (entry) => entry.type === "assignment",
  )!.attachmentIds.push(file.id);
  return next;
}

export function promptName(): string | null {
  return window.prompt("Nome do preset", "Minha organização");
}
