"use client";
import { Loader2, Send } from "lucide-react";
import { Pagination } from "../../components/pagination.tsx";
import { previewStatusLabel, STUDENT_PAGE_SIZE, studentPage } from "./helpers.ts";
import type { MoodleStudentPreview } from "./schemas.ts";

const defaultLabels: Record<string, string> = { city: "Cidade", country: "País" };

/** What Moodle would do, before it does anything. The one button here is the only one that registers the students. */
export function MoodleStudentConfirmation({
  preview,
  page,
  busy,
  authenticated,
  onPageChange,
  onConfirm,
}: {
  preview: MoodleStudentPreview;
  page: number;
  busy: boolean;
  authenticated: boolean;
  onPageChange: (page: number) => void;
  onConfirm: () => Promise<void>;
}) {
  const options = preview.effectiveOptions;
  const total = preview.rows.length;
  return (
    <section className="stu-confirm" aria-labelledby="student-confirm-title">
      <header>
        <h3 id="student-confirm-title">Confira antes de cadastrar</h3>
        <p className="stu-help">Nada foi cadastrado ainda.</p>
      </header>
      <div className="table-scroll stu-table">
        <table>
          <thead>
            <tr>
              <th scope="col">Usuário</th>
              <th scope="col">Nome</th>
              <th scope="col">E-mail</th>
              <th scope="col">Situação</th>
            </tr>
          </thead>
          <tbody>
            {studentPage(preview.rows, page).map((row, index) => (
              <tr key={`${row.username}-${index}`}>
                <td>{row.username}</td>
                <td>{row.name}</td>
                <td>{row.email}</td>
                <td>{previewStatusLabel(row.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > STUDENT_PAGE_SIZE && (
        <Pagination page={page} count={total} onChange={onPageChange} />
      )}
      <details className="stu-details">
        <summary>Ver detalhes</summary>
        <p>
          {options.newPassword === "generated-by-moodle-and-email"
            ? "Senha nova: o Moodle cria e envia por e-mail."
            : "Senha nova: não é criada."}
        </p>
        <p>Quem já existe mantém a senha. Só os dados do arquivo mudam.</p>
        {Object.keys(options.defaults).length > 0 && (
          <dl>
            {Object.entries(options.defaults).map(([key, value]) => (
              <div key={key}>
                <dt>{defaultLabels[key] ?? key}</dt>
                <dd>{value || "(em branco)"}</dd>
              </div>
            ))}
          </dl>
        )}
        {options.enrolments.length > 0 && (
          <div className="table-scroll stu-table">
            <table>
              <thead>
                <tr>
                  <th scope="col">Curso</th>
                  <th scope="col">Prazo</th>
                  <th scope="col">Aviso de fim</th>
                </tr>
              </thead>
              <tbody>
                {options.enrolments.map((enrolment) => (
                  <tr key={`${enrolment.courseId}-${enrolment.enrolId}`}>
                    <td>{enrolment.shortName}</td>
                    <td>
                      {enrolment.durationSeconds === 0
                        ? "Sem prazo"
                        : `${enrolment.durationSeconds / 86400} dias`}
                    </td>
                    <td>{enrolment.expiryNotify ? "Ligado" : "Desligado"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p>Nada é apagado, renomeado ou suspenso.</p>
      </details>
      {preview.issues?.map((issue) => (
        <p className="stu-hint" key={issue.code}>
          {issue.message}
        </p>
      ))}
      <button
        type="button"
        className="primary stu-confirm-button"
        disabled={busy || !authenticated}
        onClick={() => {
          void onConfirm();
        }}
      >
        {busy ? (
          <Loader2 size={20} className="spinner" aria-hidden="true" />
        ) : (
          <Send size={20} aria-hidden="true" />
        )}
        {busy ? "Enviando…" : `${options.mode === "update" ? "Atualizar" : "Cadastrar"} ${total} ${total === 1 ? "aluno" : "alunos"}`}
      </button>
    </section>
  );
}
