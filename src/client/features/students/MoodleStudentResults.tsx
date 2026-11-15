"use client";
import { ScrollRegion } from "../../components/scroll-region.tsx";
import { useStageFocus } from "./hooks/use-stage-focus.ts";
import type { MoodleStudentResult } from "./schemas.ts";

const statusLabels: Record<MoodleStudentResult["status"], string> = {
  created: "Criado",
  updated: "Atualizado",
  error: "Erro",
  unknown: "Não sabemos",
};
const countLabels: Record<MoodleStudentResult["status"], [string, string]> = {
  created: ["criado", "criados"],
  updated: ["atualizado", "atualizados"],
  error: ["com erro", "com erro"],
  unknown: ["sem resposta", "sem resposta"],
};

/** The outcome for each student, with the totals first so the answer is in the first line. */
export function MoodleStudentResults({
  results,
}: {
  results: MoodleStudentResult[];
}) {
  // O resultado chega depois do botão de cadastrar: o foco vai para o título dele.
  const heading = useStageFocus(true, false);
  const counts = (Object.keys(statusLabels) as MoodleStudentResult["status"][])
    .map((status) => ({
      status,
      total: results.filter((entry) => entry.status === status).length,
    }))
    .filter((entry) => entry.total > 0);
  return (
    <section className="stu-results" aria-labelledby="student-results-title">
      <h3 id="student-results-title" tabIndex={-1} ref={heading}>
        Resultado
      </h3>
      <ul className="stu-counts">
        {counts.map(({ status, total }) => (
          <li key={status} className={status}>
            {total} {countLabels[status][total === 1 ? 0 : 1]}
          </li>
        ))}
      </ul>
      <ScrollRegion className="table-scroll stu-table" label="Resultado de cada aluno">
        <table>
          <thead>
            <tr>
              <th scope="col">Usuário</th>
              <th scope="col">Situação</th>
              <th scope="col">Detalhe</th>
            </tr>
          </thead>
          <tbody>
            {results.map((entry, index) => (
              <tr key={`${entry.username}-${index}`}>
                <td>{entry.username}</td>
                <td>{statusLabels[entry.status] ?? entry.status}</td>
                <td>{entry.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollRegion>
    </section>
  );
}
