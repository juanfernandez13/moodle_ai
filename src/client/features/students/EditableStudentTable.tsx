"use client";
import { Pagination } from "../../components/pagination.tsx";
import type { StudentRow, StudentIssue } from "../../../domain/students/index.ts";
import { editableStudentFields, studentFieldLabels, studentPage } from "./helpers.ts";
import type { StudentEditField } from "./helpers.ts";

export function EditableStudentTable({
  rows,
  issues,
  page,
  onPageChange,
  onRowChange,
  typed,
  size,
  login,
}: {
  rows: StudentRow[];
  issues: StudentIssue[];
  page: number;
  onPageChange: (page: number) => void;
  onRowChange: (id: string, field: StudentEditField, value: string) => void;
  /** The students were typed by hand: there is no spreadsheet row to show as "original". */
  typed?: boolean | undefined;
  /** Students per page; ten when the screen does not say (the review step measures what fits). */
  size?: number | undefined;
  /** The spreadsheet brought a login of its own: show it. Otherwise the login is the CPF (or the e-mail) and has no column. */
  login?: boolean | undefined;
}) {
  const headings: Record<StudentEditField, string> = {
    firstName: "Primeiro nome",
    lastName: "Sobrenome",
    email: "E-mail",
    cpf: login ? "CPF" : "CPF (usuário)",
    course: "Disciplina",
    username: "Usuário (login)",
  };
  const fields = editableStudentFields.filter((field) => login || field !== "username");
  return (
    <>
      <div className="table-scroll stu-table">
        <table aria-label="Alunos para conferir" data-typed={typed || undefined}>
          <thead>
            <tr>
              <th scope="col">Linha</th>
              {fields.map((field) => (
                <th scope="col" key={field} data-field={field}>
                  {headings[field]}
                </th>
              ))}
              {!typed && (
                <th scope="col" className="stu-col-original">
                  Original
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {studentPage(rows, page, size).map((row) => (
              <tr key={row.id} id={`student-${row.id}`}>
                <td className="stu-row-number" data-label="Linha">
                  {row.rowNumber}
                </td>
                {fields.map((field) => (
                  <td key={field} data-label={headings[field]} data-field={field}>
                    <input
                      aria-label={`Linha ${row.rowNumber}: ${studentFieldLabels[field]}`}
                      value={row[field]}
                      aria-invalid={issues.some(
                        (issue) =>
                          issue.rowId === row.id &&
                          issue.path.endsWith(field),
                      )}
                      onChange={(event) =>
                        onRowChange(row.id, field, event.target.value)
                      }
                    />
                  </td>
                ))}
                {!typed && (
                  <td className="stu-original" data-label="Original">
                    <details>
                      <summary
                        aria-label={`Ver original da linha ${row.rowNumber}`}
                      >
                        Ver
                      </summary>
                      <div className="stu-original-body">
                        {Object.entries(row.original).map(([key, value]) => (
                          <p key={key}>
                            {key}: {value}
                          </p>
                        ))}
                      </div>
                    </details>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {studentPage(rows, 1, size).length > 0 && (
        <Pagination page={page} count={rows.length} size={size} onChange={onPageChange} />
      )}
    </>
  );
}
