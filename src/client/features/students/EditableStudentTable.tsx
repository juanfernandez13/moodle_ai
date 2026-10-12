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
  return (
    <>
      <div className="table-scroll student-table">
        <table>
          <thead>
            <tr>
              <th>Linha</th>
              <th>Usuário</th>
              <th>Primeiro nome</th>
              <th>Sobrenome</th>
              <th>E-mail</th>
              <th>CPF</th>
              <th>Curso</th>
              <th>Origem</th>
            </tr>
          </thead>
          <tbody>
            {studentPage(rows, page).map((row) => (
              <tr key={row.id} id={`student-${row.id}`}>
                <td>{row.rowNumber}</td>
                {editableStudentFields.map((field) => (
                  <td key={field}>
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
                <td>
                  <details>
                    <summary>Fonte</summary>
                    {Object.entries(row.original).map(([key, value]) => (
                      <p key={key}>
                        {key}: {value}
                      </p>
                    ))}
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} count={rows.length} onChange={onPageChange} />
    </>
  );
}

