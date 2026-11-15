"use client";
import { useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Check, Loader2, Plus, X } from "lucide-react";
import type { StudentRow, StudentIssue, StudentOptions, StudentRepeat } from "../../../domain/students/index.ts";
import { EditableStudentTable } from "./EditableStudentTable.tsx";
import { deriveStudentUsername } from "../../../domain/students/index.ts";
import { studentCourses } from "./helpers.ts";
import type { StudentEditField } from "./helpers.ts";
import { useStageFocus } from "./hooks/use-stage-focus.ts";

const MODES = [
  ["create", "Criar novos usuários"],
  ["update", "Atualizar existentes"],
] as const;

/** Second step: the whole list as the system understood it, in one table that scrolls. What is wrong is red. */
export function StudentReview({
  rows,
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
  validation: {
    valid: boolean;
    issues: StudentIssue[];
    repeats: StudentRepeat[];
  };
  options: StudentOptions;
  /** The disciplines of the class: every student goes to each one, in a file per discipline. */
  destinations: string[];
  busy: boolean;
  onRowChange: (id: string, field: StudentEditField, value: string) => void;
  onOptionsChange: (options: StudentOptions) => void;
  onDestinationsChange: (value: string[]) => void;
  onPrepare: () => Promise<void>;
  onBack: () => void;
}) {
  const heading = useStageFocus(true, false);
  const [draft, setDraft] = useState("");
  const courses = studentCourses(destinations);
  const missing = options.enrol && courses.length === 0;
  // Um aluno repetido repete e-mail, usuário e CPF com a mesma frase: uma pendência, não três (cada campo segue em vermelho).
  const listed = validation.issues.filter(
    (issue, index, all) => all.findIndex((other) => other.rowId === issue.rowId && other.message === issue.message) === index,
  );
  const count = listed.length;
  // O mesmo aluno escrito de novo não é pendência: fica como aviso, e a linha repetida não vai no arquivo.
  const repeats = validation.repeats;
  const repeated = new Set(repeats.map((repeat) => repeat.rowId));
  const sent = rows.length - repeats.length;
  // The login has a column only when the spreadsheet brought one that is not the CPF or the e-mail, or when the login itself
  // is not allowed (spaces, symbols). A repeated or wrong CPF is told on the CPF column, not on a login nobody typed.
  const login =
    rows.some((row) => row.username !== deriveStudentUsername(row)) ||
    validation.issues.some((issue) => issue.code === "invalid_username");
  const blocked = !validation.valid || missing;
  const bad = count > 0 || missing;

  /** A pendência leva à linha dela: a tabela rola até o aluno e o foco vai para o campo em vermelho (ou o primeiro). */
  function open(rowId: string) {
    const node = document.getElementById(`student-${rowId}`);
    if (!node) return;
    node.scrollIntoView({
      block: "center",
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
    (
      node.querySelector<HTMLElement>("[aria-invalid=true]") ?? node.querySelector<HTMLElement>("input")
    )?.focus({ preventScroll: true });
  }
  /** O que está escrito vira mais uma disciplina (Enter, o botão ou sair do campo): nada digitado se perde. */
  function addCourse() {
    const value = draft.trim();
    if (draft) setDraft("");
    if (value && !courses.includes(value)) onDestinationsChange([...courses, value]);
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
            : missing
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
        {/* Os mesmos alunos vão para cada disciplina da lista (um arquivo por disciplina), como no app original. A lista
            começa pelas disciplinas que a planilha traz. */}
        <div className="stu-courses" role="group" aria-labelledby="student-courses-label">
          <span id="student-courses-label" className="stu-courses-label">
            {courses.length > 1 ? "Disciplinas" : "Disciplina"}
          </span>
          {courses.length > 0 && (
            <ul className="stu-course-list">
              {courses.map((course) => (
                <li key={course} className="stu-course">
                  <span className="stu-course-name" title={course}>
                    {course}
                  </span>
                  <button
                    type="button"
                    aria-label={`Tirar ${course}`}
                    onClick={() => onDestinationsChange(courses.filter((item) => item !== course))}
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <span className="field stu-course-add">
            <input
              value={draft}
              aria-label={courses.length ? "Adicionar outra disciplina" : "Disciplina"}
              aria-invalid={missing || undefined}
              aria-describedby={missing || courses.length > 1 ? "student-courses-help" : undefined}
              placeholder={courses.length ? "Adicionar outra" : "Ex.: PROG-2026"}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                addCourse();
              }}
              onBlur={addCourse}
            />
            <button
              type="button"
              className="stu-course-plus"
              aria-label="Adicionar disciplina"
              disabled={!draft.trim()}
              onClick={addCourse}
            >
              <Plus size={16} aria-hidden="true" />
            </button>
          </span>
          {(missing || courses.length > 1) && (
            <small id="student-courses-help" className={`stu-courses-help${missing ? " error-text" : ""}`}>
              {missing
                ? "Falta a disciplina."
                : `${sent} ${sent === 1 ? "aluno" : "alunos"} em cada uma`}
            </small>
          )}
        </div>
      </div>
      <div className="stu-review-table">
        <EditableStudentTable
          rows={rows}
          issues={validation.issues}
          login={login}
          repeated={repeated}
          onRowChange={onRowChange}
        />
      </div>
      {(count > 0 || repeats.length > 0) && (
        <ul
          className="stu-issues"
          aria-label={count === 0 ? "Avisos" : repeats.length ? "Pendências e avisos" : "Pendências"}
        >
          {listed.map((issue, index) => {
            const row = rows.find((entry) => entry.id === issue.rowId);
            return (
              <li key={index}>
                <button type="button" className="issue-link" onClick={() => open(issue.rowId)}>
                  {row ? `Linha ${row.rowNumber}: ` : ""}
                  {issue.message}
                </button>
              </li>
            );
          })}
          {repeats.map((repeat) => (
            <li key={repeat.rowId}>
              <button type="button" className="issue-link note" onClick={() => open(repeat.rowId)}>
                Linha {repeat.rowNumber}: mesmo aluno da linha {repeat.first}. Vai uma vez só.
              </button>
            </li>
          ))}
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
          {busy ? "Preparando…" : courses.length > 1 ? `Preparar ${courses.length} arquivos` : "Preparar arquivo"}
          {busy ? null : <ArrowRight size={16} aria-hidden="true" />}
        </button>
      </div>
    </section>
  );
}
