"use client";
import { Check, Download } from "lucide-react";
import { Modal } from "../../../components/modal.tsx";
import { activityLabels } from "../../../project.ts";
import type { CourseProject } from "../../../project.ts";
import type { CourseBuilderModel } from "../hooks/use-course-builder.ts";

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
  return (
    <Modal
      title="Conferir curso para exportação"
      onClose={() => setShowReview(false)}
    >
      <h3>{project.draft.metadata.fullName}</h3>
      <p>
        Revisão {project.draft.revision}: {project.draft.sections.length}{" "}
        unidades, {allActivities.length} atividades e{" "}
        {project.assets.length} arquivos.
      </p>
      {project.draft.sections.map((entry, index) => (
        <div className="review-unit" key={entry.id}>
          <strong>
            {index + 1}. {entry.title}
          </strong>
          <ul>
            {entry.activities.map((item) => (
              <li key={item.id}>
                {activityLabels[item.type]}: {item.title}
                {item.schedule?.closesAt
                  ? ` · até ${item.schedule.closesAt}`
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
          <h3>Resolva antes de gerar</h3>
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
          <Check size={18} />
          Revisão validada. Edições posteriores exigem nova conferência.
        </p>
      )}
      <div className="notice">
        Perfil testado no laboratório local: Moodle 4.1.17, build 20250317.
        Use a conferência de restauração nesse ambiente; outras versões não
        foram verificadas.
      </div>
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
          disabled={
            busy !== null ||
            issues.some((issue) => issue.severity === "error")
          }
          onClick={() => {
            void exportMbz();
          }}
        >
          <Download size={18} />
          Gerar backup MBZ
        </button>
      </div>
    </Modal>
  );
}
