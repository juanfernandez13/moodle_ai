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
}: {
  rows: StudentRow[];
  issues: StudentIssue[];
  page: number;
  onPageChange: (page: number) => void;
  onRowChange: (id: string, field: StudentEditField, value: string) => void;
}) {
  const headings: Record<StudentEditField, string> = {
    firstName: "Primeiro nome",
    lastName: "Sobrenome",
    email: "E-mail",
    cpf: "CPF",
    course: "Curso",
    username: "Usuário",
  };
  return (
    <>
      <div className="table-scroll stu-table">
        <table>
          <thead>
            <tr>
              <th scope="col">Linha</th>
              {editableStudentFields.map((field) => (
                <th scope="col" key={field}>
                  {headings[field]}
                </th>
              ))}
              <th scope="col">Original</th>
            </tr>
          </thead>
          <tbody>
            {studentPage(rows, page).map((row) => (
              <tr key={row.id} id={`student-${row.id}`}>
                <td className="stu-row-number" data-label="Linha">
                  {row.rowNumber}
                </td>
                {editableStudentFields.map((field) => (
                  <td key={field} data-label={headings[field]}>
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
                <td className="stu-original" data-label="Original">
                  <details>
                    <summary aria-label={`Ver original da linha ${row.rowNumber}`}>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {studentPage(rows, 1).length > 0 && (
        <Pagination page={page} count={rows.length} onChange={onPageChange} />
      )}
    </>
  );
}
