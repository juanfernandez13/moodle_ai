"use client";
import { Download, FileDown } from "lucide-react";
import { downloadFile } from "../../download.ts";
import type { StudentPreview } from "../../../domain/students/index.ts";

/** The first of the two ways to finish: save the checked list as a CSV file, one per course. */
export function StudentExports({
  previews,
}: { previews: StudentPreview[] }) {
  const many = previews.length > 1;
  function save(preview: StudentPreview, index: number) {
    downloadFile(
      new TextEncoder().encode(preview.csv),
      `alunos-${preview.rows[0]?.course || index + 1}.csv`,
      "text/csv;charset=utf-8",
    );
  }
  return (
    <section
      className="stu-card stu-csv"
      aria-label={many ? "Baixar arquivos CSV" : "Baixar arquivo CSV"}
    >
      <span className="stu-card-icon" aria-hidden="true">
        <FileDown size={32} />
      </span>
      {many ? (
        <>
          <p className="stu-card-title">Baixar arquivos CSV</p>
          <ul className="stu-files">
            {previews.map((preview, index) => (
              <li key={preview.hash}>
                <span>
                  <strong>
                    {preview.rows[0]?.course || "Cadastro de usuários"}
                  </strong>
                  <small>
                    {preview.count} {preview.count === 1 ? "aluno" : "alunos"}
                  </small>
                </span>
                <button
                  type="button"
                  className="primary"
                  aria-label={`Baixar ${preview.rows[0]?.course || `arquivo ${index + 1}`}`}
                  onClick={() => save(preview, index)}
                >
                  <Download size={20} aria-hidden="true" />
                  Baixar
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <button
          type="button"
          className="primary stu-big"
          onClick={() => {
            const only = previews[0];
            if (only) save(only, 0);
          }}
        >
          <Download size={22} aria-hidden="true" />
          Baixar arquivo CSV
        </button>
      )}
      <p className="stu-help">Guarde e envie depois.</p>
    </section>
  );
}
