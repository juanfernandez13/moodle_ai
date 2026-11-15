"use client";
import { useId } from "react";
import { Check, AlertCircle } from "lucide-react";
import { useCalmText } from "../../../components/calm-text.ts";
import type { CourseBuilderModel } from "../hooks/use-course-builder.ts";

type Props = Pick<CourseBuilderModel, "issues" | "showIssue">;

/** O que ainda impede de baixar o curso. "Conferir curso" fica uma vez só, no alto da página. */
export function ReviewSidebar({ issues, showIssue }: Props) {
  const titleId = useId();
  const count = issues.length
    ? `${issues.length} ${issues.length === 1 ? "pendência" : "pendências"}`
    : "Tudo certo para conferir";
  // A contagem muda enquanto a pessoa digita: o leitor de tela fala só a final, quando ela para.
  const calmCount = useCalmText(count);
  return (
    <aside className="issues-panel surface-panel" aria-labelledby={titleId}>
      <h2 id={titleId}>Pendências</h2>
      <div className={issues.length ? "issue-count" : "valid-count"}>
        {issues.length ? (
          <AlertCircle size={20} aria-hidden="true" />
        ) : (
          <Check size={20} aria-hidden="true" />
        )}
        <strong>{count}</strong>
        <span className="visually-hidden" role="status">
          {calmCount}
        </span>
      </div>
      <div className="issues-body">
        {issues.length > 0 && (
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
      </div>
    </aside>
  );
}
