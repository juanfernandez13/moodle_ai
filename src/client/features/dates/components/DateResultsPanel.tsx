import { Pagination } from "../../../components/pagination.tsx";
import { dateResultLabel } from "../helpers.ts";
import type { DateOperationResult } from "../types.ts";
interface Props {
  results: DateOperationResult[];
  page: number;
  onPageChange(page: number): void;
}

export function DateResultsPanel({ results, page, onPageChange }: Props) {
  return (
    <section className="notice">
      <h3>Resultado por alvo</h3>
      <p>
        {results.filter((entry) => entry.status === "applied").length} de{" "}
        {results.length} alvos aplicados.
        {results.some((entry) => entry.status === "applied") &&
          results.some((entry) => entry.status !== "applied")
          ? " A aplicação foi parcial; confira os demais resultados antes de continuar."
          : ""}
      </p>
      <table>
        <thead>
          <tr>
            <th>Alvo</th>
            <th>Estado</th>
            <th>Resultado</th>
          </tr>
        </thead>
        <tbody>
          {results.slice(page * 10, page * 10 + 10).map((entry) => (
            <tr key={entry.id}>
              <td>{entry.title || entry.id}</td>
              <td>
                {dateResultLabel(entry.status)}
              </td>
              <td>{entry.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination page={page} count={results.length} onChange={onPageChange} />
    </section>
  );
}
