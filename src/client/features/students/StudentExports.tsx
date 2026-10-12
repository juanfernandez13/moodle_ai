"use client";
import { Download } from "lucide-react";
import { downloadFile } from "../../download.ts";
import type { StudentPreview } from "../../../domain/students/index.ts";

export function StudentExports({
  previews,
}: { previews: StudentPreview[] }) {
  return (
    <section className="delivery">
      <div>
        <h2>CSVs conferidos</h2>
        <p>
          Os arquivos correspondem à lista e às opções que você conferiu.
          Editar invalida esta prévia.
        </p>
        {previews.map((preview, index) => (
          <div className="preset-row" key={preview.hash}>
            <span>
              <strong>
                {preview.rows[0]?.course || "Cadastro de usuários"}
              </strong>
              <small>
                {preview.count} alunos · identificação{" "}
                {preview.hash.slice(0, 12)}
              </small>
            </span>
            <button
              type="button"
              className="primary"
              onClick={() =>
                downloadFile(
                  new TextEncoder().encode(preview.csv),
                  `alunos-${preview.rows[0]?.course || index + 1}.csv`,
                  "text/csv;charset=utf-8",
                )
              }
            >
              <Download size={17} />
              Baixar CSV
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

