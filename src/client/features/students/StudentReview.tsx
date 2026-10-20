"use client";
import { AlertCircle, ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import type { StudentRow, StudentIssue, StudentOptions } from "../../../domain/students/index.ts";
import { EditableStudentTable } from "./EditableStudentTable.tsx";
import { STUDENT_PAGE_SIZE, studentCourseGaps } from "./helpers.ts";
import type { StudentEditField } from "./helpers.ts";
import { useStageFocus } from "./hooks/use-stage-focus.ts";

const MODES = [
  ["create", "Criar novos usuários"],
  ["update", "Atualizar existentes"],
] as const;

/** Second step: the list as the system understood it. What is wrong is red, and the options sit under the table. */
export function StudentReview({
  rows,
  validation,
  page,
  options,
  destinations,
  busy,
  onPageChange,
  onRowChange,
  onOptionsChange,
  onDestinationsChange,
  onPrepare,
  onBack,
}: {
  rows: StudentRow[];
  validation: {
    valid: boolean;
    issues: StudentIssue[]
  };
  page: number;
  options: StudentOptions;
  destinations: string;
  busy: boolean;
  onPageChange: (page: number) => void;
  onRowChange: (id: string, field: StudentEditField, value: string) => void;
  onOptionsChange: (options: StudentOptions) => void;
  onDestinationsChange: (value: string) => void;
  onPrepare: () => Promise<void>;
  onBack: () => void;
}) {
  const heading = useStageFocus(true, false);
  const gaps = studentCourseGaps(rows, options, destinations);
  const count = validation.issues.length;
  const blocked = !validation.valid || gaps.length > 0;
  const bad = count > 0 || gaps.length > 0;

  function open(issue: StudentIssue) {
    const index = rows.findIndex((row) => row.id === issue.rowId);
    if (index < 0) return;
    onPageChange(Math.floor(index / STUDENT_PAGE_SIZE));
    setTimeout(() => {
      const node = document.getElementById(`student-${issue.rowId}`);
      node?.scrollIntoView({ block: "center" });
      (
        node?.querySelector("[aria-invalid=true]") as HTMLElement | null
      )?.focus();
    }, 50);
  }

  return (
    <section className="stu-review" aria-labelledby="student-review-title">
      <header className="stu-stage-head">
        <div>
          <h2 id="student-review-title" tabIndex={-1} ref={heading}>
            Conferir {rows.length} {rows.length === 1 ? "aluno" : "alunos"}
          </h2>
          <p className="stu-help">
            {blocked
              ? "Corrija o que estiver em vermelho."
              : "Confira os dados e continue."}
          </p>
        </div>
        <p className={`stu-chip ${bad ? "bad" : "ok"}`} role="status">
          {bad ? (
            <AlertCircle size={20} aria-hidden="true" />
          ) : (
            <Check size={20} aria-hidden="true" />
          )}
          {count
            ? `${count} ${count === 1 ? "pendência" : "pendências"}`
            : gaps.length
              ? "Falta o curso"
              : "Tudo certo"}
        </p>
      </header>
      <div className={`stu-review-table${rows.length > 2 ? " tall" : ""}`}>
        <EditableStudentTable
          rows={rows}
          issues={[...validation.issues, ...gaps]}
          page={page}
          onPageChange={onPageChange}
          onRowChange={onRowChange}
        />
      </div>
      {count > 0 && (
        <ul className="stu-issues" aria-label="Pendências">
          {validation.issues.map((issue, index) => {
            const row = rows.find((entry) => entry.id === issue.rowId);
            return (
              <li key={index}>
                <button type="button" className="issue-link" onClick={() => open(issue)}>
                  {row ? `Linha ${row.rowNumber}: ` : ""}
                  {issue.message}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="stu-options">
        <fieldset className="stu-mode">
          <legend>Tipo de cadastro</legend>
          <div className="stu-pills">
            {MODES.map(([value, label]) => (
              <label key={value} className="stu-pill">
                <input
                  type="radio"
                  name="student-mode"
                  value={value}
                  checked={options.mode === value}
                  onChange={() => onOptionsChange({ ...options, mode: value })}
                />
                <span>
                  {options.mode === value && (
                    <Check size={18} aria-hidden="true" />
                  )}
                  {label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="field stu-courses">
          <span>Cursos (opcional)</span>
          <input
            value={destinations}
            disabled={!options.enrol}
            aria-invalid={gaps.length > 0}
            aria-describedby="student-courses-help"
            placeholder="PROG-2026, LOGICA-2026"
            onChange={(event) => onDestinationsChange(event.target.value)}
          />
          <small
            id="student-courses-help"
            className={`field-help${gaps.length > 0 ? " error-text" : ""}`}
          >
            {gaps.length > 0
              ? "Falta o curso. Escreva aqui ou na tabela."
              : "Código do curso. Vários: separe por vírgula."}
          </small>
        </label>
        <label className="check-row stu-enrol">
          <input
            type="checkbox"
            checked={options.enrol}
            onChange={(event) =>
              onOptionsChange({ ...options, enrol: event.target.checked })
            }
          />
          <span>Matricular nos cursos</span>
        </label>
      </div>
      <div className="stu-actions">
        <button type="button" className="text-button" onClick={onBack}>
          <ArrowLeft size={20} aria-hidden="true" />
          Voltar
        </button>
        {blocked && (
          <p className="stu-hint" id="student-prepare-hint">
            {count ? "Resolva as pendências para continuar." : "Informe o curso para continuar."}
          </p>
        )}
        <button
          type="button"
          className="primary"
          disabled={busy || blocked}
          aria-describedby={blocked ? "student-prepare-hint" : undefined}
          onClick={() => {
            void onPrepare();
          }}
        >
          {busy ? (
            <Loader2 size={20} className="spinner" aria-hidden="true" />
          ) : null}
          {busy ? "Preparando…" : "Preparar arquivos"}
          {busy ? null : <ArrowRight size={20} aria-hidden="true" />}
        </button>
      </div>
    </section>
  );
}
