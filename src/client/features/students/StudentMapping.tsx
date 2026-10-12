"use client";
import type { StudentMapping } from "../../../domain/students/index.ts";
import { studentFields } from "./helpers.ts";

export function StudentMappingEditor({
  matrix,
  mapping,
  onChange,
  onApply,
}: {
  matrix: string[][];
  mapping: StudentMapping;
  onChange: (mapping: StudentMapping) => void;
  onApply: () => void;
}) {
  return (
    <section className="notice">
      <h2>Relacionar as colunas</h2>
      <p>
        Confira a primeira linha. Ela só será tratada como cabeçalho se
        você marcar a opção.
      </p>
      <label className="check-row">
        <input
          type="checkbox"
          checked={mapping.header}
          onChange={(event) =>
            onChange({ ...mapping, header: event.target.checked })
          }
        />
        A primeira linha contém os nomes das colunas
      </label>
      <div className="table-scroll sheet-preview">
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
      <div className="mapping-grid">
        {studentFields.map(([field, label]) => (
          <label className="field" key={field}>
            <span>{label}</span>
            <select
              value={mapping.columns[field] ?? ""}
              onChange={(event) => {
                const columns = { ...mapping.columns };
                if (event.target.value)
                  columns[field] = Number(event.target.value);
                else delete columns[field];
                onChange({ ...mapping, columns });
              }}
            >
              <option value="">Não usar coluna</option>
              {Array.from(
                {
                  length: Math.max(...matrix.map((row) => row.length)),
                },
                (_, index) => (
                  <option key={index} value={index}>
                    Coluna {index + 1}
                    {mapping.header
                      ? `: ${matrix[0]?.[index] ?? ""}`
                      : ""}
                  </option>
                ),
              )}
            </select>
          </label>
        ))}
      </div>
      <button
        type="button"
        className="primary"
        onClick={onApply}
      >
        Aplicar mapeamento
      </button>
    </section>
  );
}

