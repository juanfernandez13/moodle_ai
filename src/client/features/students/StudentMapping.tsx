"use client";
import { ArrowLeft, Check } from "lucide-react";
import type { StudentMapping } from "../../../domain/students/index.ts";
import { studentFields } from "./helpers.ts";

type FieldKey = (typeof studentFields)[number][0];
const MAIN_FIELDS: FieldKey[] = ["fullName", "email", "cpf", "course"];

/** Which column of the file is the name, the e-mail and so on. Only opens when the columns were not recognized. */
export function StudentMappingEditor({
  matrix,
  mapping,
  onChange,
  onApply,
  onCancel,
}: {
  matrix: string[][];
  mapping: StudentMapping;
  onChange: (mapping: StudentMapping) => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  const width = Math.max(1, ...matrix.map((row) => row.length));
  function select([field, label]: (typeof studentFields)[number]) {
    return (
      <label className="field" key={field}>
        <span>{label}</span>
        <select
          value={mapping.columns[field] ?? ""}
          onChange={(event) => {
            const columns = { ...mapping.columns };
            if (event.target.value) columns[field] = Number(event.target.value);
            else delete columns[field];
            onChange({ ...mapping, columns });
          }}
        >
          <option value="">Não usar</option>
          {Array.from({ length: width }, (_, index) => (
            <option key={index} value={index}>
              Coluna {index + 1}
              {mapping.header ? `: ${matrix[0]?.[index] ?? ""}` : ""}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <section className="stu-mapping" aria-labelledby="student-mapping-title">
      <div className="stu-mapping-preview">
        <h2 id="student-mapping-title">Confira as colunas</h2>
        <p className="stu-help">Diga o que cada coluna tem.</p>
        <label className="check-row">
          <input
            type="checkbox"
            checked={mapping.header}
            onChange={(event) =>
              onChange({ ...mapping, header: event.target.checked })
            }
          />
          <span>A primeira linha tem os títulos</span>
        </label>
        <div className="table-scroll stu-sheet">
          <table>
            <tbody>
              {matrix.slice(0, 4).map((row, index) => (
                <tr key={index}>
                  {row.map((value, column) => (
                    <td key={column}>{value || "(vazio)"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="stu-mapping-fields">
        <div className="stu-mapping-grid">
          {studentFields.filter(([field]) => MAIN_FIELDS.includes(field)).map(select)}
        </div>
        <details className="stu-more">
          <summary>Mais colunas</summary>
          <div className="stu-mapping-grid">
            {studentFields.filter(([field]) => !MAIN_FIELDS.includes(field)).map(select)}
          </div>
        </details>
        <div className="stu-actions">
          <button type="button" className="text-button" onClick={onCancel}>
            <ArrowLeft size={20} aria-hidden="true" />
            Cancelar
          </button>
          <button type="button" className="primary" onClick={onApply}>
            <Check size={20} aria-hidden="true" />
            Usar estas colunas
          </button>
        </div>
      </div>
    </section>
  );
}
