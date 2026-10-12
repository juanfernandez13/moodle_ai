"use client";
import { Pagination } from "../../components/pagination.tsx";
import { studentPage } from "./helpers.ts";
import type { MoodleStudentResult } from "./schemas.ts";

export function MoodleStudentResults({
  results,
  page,
  onPageChange,
}: {
  results: MoodleStudentResult[];
  page: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <section className="notice">
      <h3>Resultado por aluno</h3>
      <table>
        <thead>
          <tr>
            <th>Usuário</th>
            <th>Estado</th>
            <th>Resultado</th>
          </tr>
        </thead>
        <tbody>
          {studentPage(results, page)
            .map((entry, index) => (
              <tr key={`${entry.username}-${index}`}>
                <td>{entry.username}</td>
                <td>
                  {{
                    created: "Criado",
                    updated: "Atualizado",
                    error: "Erro",
                    unknown: "Desconhecido",
                  }[entry.status] ?? entry.status}
                </td>
                <td>{entry.message}</td>
              </tr>
            ))}
        </tbody>
      </table>
      <Pagination
        page={page}
        count={results.length}
        onChange={onPageChange}
      />
    </section>
  );
}

