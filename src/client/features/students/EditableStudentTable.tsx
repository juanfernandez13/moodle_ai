"use client";
import type { StudentRow, StudentIssue } from "../../../domain/students/index.ts";
import { editableStudentFields, studentFieldLabels } from "./helpers.ts";
import type { StudentEditField } from "./helpers.ts";

/** Every student in one table, with no pages: the table scrolls inside the step and the header stays in view. */
export function EditableStudentTable({
  rows,
  issues,
  onRowChange,
  login,
  repeated,
}: {
  rows: StudentRow[];
  issues: StudentIssue[];
  /** Rows that write again a student of an earlier row: shown softer, because they go only once. */
  repeated?: ReadonlySet<string> | undefined;
  onRowChange: (id: string, field: StudentEditField, value: string) => void;
  /** The spreadsheet brought a login of its own: show it. Otherwise the login is the CPF (or the e-mail) and has no column. */
  login?: boolean | undefined;
}) {
  const headings: Record<StudentEditField, string> = {
    firstName: "Primeiro nome",
    lastName: "Sobrenome",
    email: "E-mail",
    cpf: login ? "CPF" : "CPF (usuário)",
    username: "Usuário (login)",
  };
  const fields = editableStudentFields.filter((field) => login || field !== "username");
  // One lookup per cell instead of a walk through every issue: a long class stays light to type in.
  const invalid = new Set(
    issues.map((issue) => `${issue.rowId}|${issue.path.slice(issue.path.lastIndexOf(".") + 1)}`),
  );
  return (
    <div className="table-scroll stu-table">
      <table aria-label="Alunos para conferir">
        <thead>
          <tr>
            <th scope="col">Linha</th>
            {fields.map((field) => (
              <th scope="col" key={field} data-field={field}>
                {headings[field]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              id={`student-${row.id}`}
              data-repeat={repeated?.has(row.id) ? "" : undefined}
            >
              <td className="stu-row-number" data-label="Linha">
                {row.rowNumber}
              </td>
              {fields.map((field) => (
                <td key={field} data-label={headings[field]} data-field={field}>
                  <input
                    aria-label={`Linha ${row.rowNumber}: ${studentFieldLabels[field]}`}
                    value={row[field]}
                    aria-invalid={invalid.has(`${row.id}|${field}`)}
                    onChange={(event) =>
                      onRowChange(row.id, field, event.target.value)
                    }
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
