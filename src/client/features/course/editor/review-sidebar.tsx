"use client";
import { Check, AlertCircle } from "lucide-react";
import type { CourseProject } from "../../../project.ts";
import type { CourseBuilderModel } from "../hooks/use-course-builder.ts";

type Props = Pick<
  CourseBuilderModel,
  "issues" | "showIssue" | "setShowReview" | "setValidatedRevision"
>
  & { project: CourseProject; };

export function ReviewSidebar({
  project,
  issues,
  showIssue,
  setShowReview,
  setValidatedRevision
}: Props) {
  return (
    <aside className="issues-panel surface-panel">
      <h2>Conferência</h2>
      <p className="revision-label">Revisão {project.draft.revision}</p>
      <div className={issues.length ? "issue-count" : "valid-count"}>
        {issues.length ? <AlertCircle size={20} /> : <Check size={20} />}
        <strong>
          {issues.length
            ? `${issues.length} ${issues.length === 1 ? "pendência" : "pendências"}`
            : "Estrutura válida"}
        </strong>
      </div>
      <div className="issues-body">
        {issues.length === 0 ? (
          <p className="field-help">
            Confira o conteúdo e gere o backup desta revisão.
          </p>
        ) : (
          <ul className="issue-list">
            {issues.slice(0, 30).map((issue, index) => (
              <li key={`${issue.path}-${index}`}>
                <button type="button" onClick={() => showIssue(issue)}>
                  <strong>{issue.message}</strong>
                  <small>{issue.path}</small>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="field-help">
          Perfil testado no laboratório Moodle 4.1.17, build 20250317.
          Outras versões não foram verificadas.
        </p>
      </div>
      <button
        type="button"
        className="secondary full-width"
        onClick={() => {
          setShowReview(true);
          setValidatedRevision(
            issues.some((issue) => issue.severity === "error")
              ? null
              : project.draft.revision,
          );
        }}
      >
        Conferir revisão
      </button>
    </aside>
  );
}
