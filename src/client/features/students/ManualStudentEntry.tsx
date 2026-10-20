"use client";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import {
  MANUAL_STUDENT_LIMIT,
  MANUAL_STUDENT_ROWS,
  emptyManualStudent,
  manualStudentFields,
  manualStudentsToMatrix,
} from "./helpers.ts";
import type { ManualStudent, ManualStudentField } from "./helpers.ts";

const inputModes: Record<ManualStudentField, "text" | "email" | "numeric"> = {
  fullName: "text",
  email: "email",
  cpf: "numeric",
  course: "text",
};

/**
 * The students typed in by hand, in the same columns as the example spreadsheet. "Continuar" turns the typed
 * rows into that spreadsheet's matrix, so the mapping, the checks and the review are the ones a file gets.
 */
export function ManualStudentEntry({
  busy,
  onContinue,
}: {
  busy: boolean;
  onContinue: (matrix: string[][]) => void;
}) {
  const lastId = useRef(MANUAL_STUDENT_ROWS);
  const [students, setStudents] = useState<ManualStudent[]>(() =>
    Array.from({ length: MANUAL_STUDENT_ROWS }, (_, index) =>
      emptyManualStudent(index + 1),
    ),
  );
  const [focusId, setFocusId] = useState<number | null>(null);
  const [empty, setEmpty] = useState(false);
  useEffect(() => {
    if (focusId === null) return;
    document.getElementById(`manual-${focusId}-fullName`)?.focus();
    setFocusId(null);
  }, [focusId]);
  const full = students.length >= MANUAL_STUDENT_LIMIT;

  function change(id: number, field: ManualStudentField, value: string) {
    setEmpty(false);
    setStudents((previous) =>
      previous.map((student) =>
        student.id === id ? { ...student, [field]: value } : student,
      ),
    );
  }
  function add() {
    if (full) return;
    const id = ++lastId.current;
    setEmpty(false);
    setStudents((previous) => [...previous, emptyManualStudent(id)]);
    setFocusId(id);
  }
  function remove(id: number) {
    const rest = students.filter((student) => student.id !== id);
    setStudents(rest.length ? rest : [emptyManualStudent(++lastId.current)]);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const typed = manualStudentsToMatrix(students);
    // The message sits beside the button, where the eyes already are, not in the banner at the top.
    setEmpty(typed.length < 2);
    if (typed.length >= 2) onContinue(typed);
  }

  return (
    <form className="stu-manual" onSubmit={submit} noValidate>
      <p className="stu-help">Preencha uma linha para cada aluno.</p>
      <div className="table-scroll stu-table stu-manual-table">
        <table>
          <thead>
            <tr>
              {manualStudentFields.map(([field, label]) => (
                <th scope="col" key={field}>
                  {label}
                </th>
              ))}
              <th scope="col">
                <span className="visually-hidden">Remover</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, index) => (
              <tr key={student.id}>
                {manualStudentFields.map(([field, label]) => (
                  <td key={field} data-label={label}>
                    <input
                      id={`manual-${student.id}-${field}`}
                      type={field === "email" ? "email" : "text"}
                      inputMode={inputModes[field]}
                      autoComplete="off"
                      aria-label={`Aluno ${index + 1}: ${label.toLowerCase()}`}
                      value={student[field]}
                      onChange={(event) =>
                        change(student.id, field, event.target.value)
                      }
                    />
                  </td>
                ))}
                <td className="stu-remove-cell">
                  <button
                    type="button"
                    className="text-button stu-remove"
                    aria-label={`Remover aluno ${index + 1}`}
                    onClick={() => remove(student.id)}
                  >
                    <Trash2 size={20} aria-hidden="true" />
                    <span>Remover</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="stu-actions">
        <button
          type="button"
          className="secondary"
          disabled={full}
          onClick={add}
        >
          <Plus size={20} aria-hidden="true" />
          Adicionar aluno
        </button>
        {empty ? (
          <p className="stu-hint error-text" role="alert">
            Preencha ao menos um aluno.
          </p>
        ) : (
          full && (
            <p className="stu-hint">Para mais alunos, use uma planilha.</p>
          )
        )}
        <button type="submit" className="primary" disabled={busy}>
          Continuar
          <ArrowRight size={20} aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
