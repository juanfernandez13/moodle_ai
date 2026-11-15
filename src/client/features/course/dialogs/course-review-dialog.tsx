"use client";
import { Check, Download } from "lucide-react";
import { Modal } from "../../../components/modal.tsx";
import { activityLabels } from "../../../project.ts";
import { readableDate } from "../../../dates.ts";
import type { CourseProject } from "../../../project.ts";
import type { CourseBuilderModel } from "../hooks/use-course-builder.ts";

function count(value: number, one: string, many: string): string {
  return `${value} ${value === 1 ? one : many}`;
}

type Props = Pick<
  CourseBuilderModel,
  "setShowReview" | "allActivities" | "issues" | "showIssue" | "busy" | "exportMbz"
>
  & { project: CourseProject; };

export function CourseReviewDialog({
  setShowReview,
  project,
  allActivities,
  issues,
  showIssue,
  busy,
  exportMbz
}: Props) {
  // Só quizzes: seções do Moodle com quizzes dentro, e o título de cada uma já é o número dela.
  const quizOnly = project.draft.metadata.quizOnly === true;
  return (
    <Modal
      title={quizOnly ? "Conferir os quizzes" : "Conferir a disciplina"}
      onClose={() => setShowReview(false)}
    >
      <h3>{project.draft.metadata.fullName}</h3>
      <p>
        {quizOnly
          ? count(project.draft.sections.length, "seção", "seções")
          : count(project.draft.sections.length, "unidade", "unidades")}
        ,{" "}
        {quizOnly
          ? count(allActivities.length, "quiz", "quizzes")
          : count(allActivities.length, "atividade", "atividades")}{" "}
        e {count(project.assets.length, "arquivo", "arquivos")}.
      </p>
      {project.draft.sections.map((entry, index) => (
        <div className="review-unit" key={entry.id}>
          <strong>
            {quizOnly ? entry.title : `${index + 1}. ${entry.title}`}
          </strong>
          <ul>
            {entry.activities.map((item) => (
              <li key={item.id}>
                {activityLabels[item.type]}: {item.title}
                {item.schedule?.closesAt
                  ? ` · até ${readableDate(item.schedule.closesAt)}`
                  : ""}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {project.draft.gradebook && (
        <p>
          Categorias:{" "}
          {project.draft.gradebook.categories
            .map((entry) => `${entry.name} ${entry.weight}%`)
            .join(", ")}
          .
        </p>
      )}
      {issues.length ? (
        <div className="review-issues">
          <h3>Para resolver antes de baixar</h3>
          {issues.map((issue, index) => (
            <button
              type="button"
              className="issue-link"
              key={index}
              onClick={() => showIssue(issue)}
            >
              {issue.message}
              <small>{issue.path}</small>
            </button>
          ))}
        </div>
      ) : (
        <p className="valid-count">
          <Check size={18} aria-hidden="true" />
          {quizOnly
            ? "Tudo certo para gerar os quizzes."
            : "Tudo certo para gerar a disciplina."}
        </p>
      )}
      <p className="field-help">Testado no Moodle 4.1 (laboratório).</p>
      {allActivities.some(
        (entry) => entry.type === "glossary" && entry.entries.length > 0,
      ) && (
          <p className="notice">
            Entradas de glossário exigem manter “Informação de usuário”
            habilitada na restauração do módulo. Nenhuma conta ou matrícula
            entra no pacote.
          </p>
        )}
      <div className="button-row">
        <button
          type="button"
          className="secondary"
          onClick={() => setShowReview(false)}
        >
          Continuar editando
        </button>
        <button
          type="button"
          className="primary"
          disabled={issues.some((issue) => issue.severity === "error")}
          aria-disabled={busy !== null ? true : undefined}
          onClick={() => {
            if (busy !== null) return;
            void exportMbz();
          }}
        >
          <Download size={18} aria-hidden="true" />
          {quizOnly ? "Gerar quizzes (.mbz)" : "Gerar disciplina (.mbz)"}
        </button>
      </div>
    </Modal>
  );
}
