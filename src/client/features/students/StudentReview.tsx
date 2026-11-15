"use client";
import { AlertCircle, ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import type { StudentRow, StudentIssue, StudentOptions } from "../../../domain/students/index.ts";
import { EditableStudentTable } from "./EditableStudentTable.tsx";
import { deriveStudentUsername } from "../../../domain/students/index.ts";
import { studentCourseGaps } from "./helpers.ts";
import type { StudentEditField } from "./helpers.ts";
import { useStageFocus } from "./hooks/use-stage-focus.ts";

const MODES = [
  ["create", "Criar novos usuários"],
  ["update", "Atualizar existentes"],
] as const;

/** Second step: the whole list as the system understood it, in one table that scrolls. What is wrong is red. */
export function StudentReview({
  rows,
  typed,
  validation,
  options,
  destinations,
  busy,
  onRowChange,
  onOptionsChange,
  onDestinationsChange,
  onPrepare,
  onBack,
}: {
  rows: StudentRow[];
  /** The students were typed by hand (no spreadsheet behind them). */
  typed: boolean;
  validation: {
    valid: boolean;
    issues: StudentIssue[]
  };
  options: StudentOptions;
  destinations: string;
  busy: boolean;
  onRowChange: (id: string, field: StudentEditField, value: string) => void;
  onOptionsChange: (options: StudentOptions) => void;
  onDestinationsChange: (value: string) => void;
  onPrepare: () => Promise<void>;
  onBack: () => void;
}) {
  const heading = useStageFocus(true, false);
  const gaps = studentCourseGaps(rows, options, destinations);
  // Um aluno repetido repete e-mail, usuário e CPF com a mesma frase: uma pendência, não três (cada campo segue em vermelho).
  const listed = validation.issues.filter(
    (issue, index, all) => all.findIndex((other) => other.rowId === issue.rowId && other.message === issue.message) === index,
  );
  const count = listed.length;
  // The login has a column only when the spreadsheet brought one that is not the CPF or the e-mail, or when the login itself
  // is not allowed (spaces, symbols). A repeated or wrong CPF is told on the CPF column, not on a login nobody typed.
  const login =
    rows.some((row) => row.username !== deriveStudentUsername(row)) ||
    validation.issues.some((issue) => issue.code === "invalid_username");
  const blocked = !validation.valid || gaps.length > 0;
  const bad = count > 0 || gaps.length > 0;
  // The course is written once, in the table. This field shows only when some student has none (or the person already
  // used it): one idea, one place.
  const askCourse =
    options.enrol &&
    (rows.some((row) => !row.course.trim()) || destinations.trim() !== "");

  /** A pendência leva à linha dela: a tabela rola até o aluno e o foco vai para o campo em vermelho. */
  function open(issue: StudentIssue) {
    const node = document.getElementById(`student-${issue.rowId}`);
    if (!node) return;
    node.scrollIntoView({
      block: "center",
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
    node.querySelector<HTMLElement>("[aria-invalid=true]")?.focus({ preventScroll: true });
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
            <AlertCircle size={16} aria-hidden="true" />
          ) : (
            <Check size={16} aria-hidden="true" />
          )}
          {count
            ? `${count} ${count === 1 ? "pendência" : "pendências"}`
            : gaps.length
              ? "Falta a disciplina"
              : "Tudo certo"}
        </p>
      </header>
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
                  {label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {askCourse && (
          <label className="field stu-courses">
            <span>Em qual disciplina?</span>
            <input
              value={destinations}
              aria-invalid={gaps.length > 0}
              aria-describedby="student-courses-help"
              placeholder="Ex.: PROG-2026"
              onChange={(event) => onDestinationsChange(event.target.value)}
            />
            <small
              id="student-courses-help"
              className={`field-help${gaps.length > 0 ? " error-text" : ""}`}
            >
              {gaps.length > 0
                ? "Falta a disciplina. Escreva aqui ou na tabela."
                : "Várias disciplinas: separe por vírgula."}
            </small>
          </label>
        )}
        <label className="check-row stu-enrol">
          <input
            type="checkbox"
            checked={options.enrol}
            onChange={(event) =>
              onOptionsChange({ ...options, enrol: event.target.checked })
            }
          />
          <span>Matricular na disciplina de cada aluno</span>
        </label>
      </div>
      <div className="stu-review-table">
        <EditableStudentTable
          rows={rows}
          typed={typed}
          issues={[...validation.issues, ...gaps]}
          login={login}
          onRowChange={onRowChange}
        />
      </div>
      {count > 0 && (
        <ul className="stu-issues" aria-label="Pendências">
          {listed.map((issue, index) => {
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
      <div className="stu-actions">
        <button type="button" className="text-button" onClick={onBack}>
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar
        </button>
        {blocked && (
          <p className="stu-hint" id="student-prepare-hint">
            {count ? "Resolva as pendências para continuar." : "Informe a disciplina para continuar."}
          </p>
        )}
        <button
          type="button"
          className="primary"
          disabled={blocked}
          aria-disabled={busy ? true : undefined}
          aria-describedby={blocked ? "student-prepare-hint" : undefined}
          onClick={() => {
            if (busy) return;
            void onPrepare();
          }}
        >
          {busy ? (
            <Loader2 size={16} className="spinner" aria-hidden="true" />
          ) : null}
          {busy ? "Preparando…" : "Preparar arquivos"}
          {busy ? null : <ArrowRight size={16} aria-hidden="true" />}
        </button>
      </div>
    </section>
  );
}
