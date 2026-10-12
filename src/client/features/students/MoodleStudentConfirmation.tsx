"use client";
import { Pagination } from "../../components/pagination.tsx";
import { studentPage } from "./helpers.ts";
import type { MoodleStudentPreview } from "./schemas.ts";

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
  return (
    <section className="notice">
      <h3>Prévia de cadastro no Moodle</h3>
      <p>
        Identificação {preview.hash.slice(0, 12)}. Nenhum aluno
        foi cadastrado nesta etapa.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {studentPage(preview.rows, page).map((row, index) => (
              <tr key={`${row.username}-${index}`}>
                <td>{row.username}</td>
                <td>{row.name}</td>
                <td>{row.email}</td>
                <td>{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        count={preview.rows.length}
        onChange={onPageChange}
      />
      {preview.effectiveOptions && (
        <details className="form-details" open>
          <summary>Opções efetivas do cadastro</summary>
          <p>
            Novas senhas:{" "}
            {preview.effectiveOptions.newPassword ===
              "generated-by-moodle-and-email"
              ? "geradas pelo Moodle e enviadas por e-mail"
              : "não são criadas"}
            . Senhas existentes são preservadas. Só os campos do CSV são
            atualizados.
          </p>
          <dl>
            {Object.entries(
              preview.effectiveOptions.defaults,
            ).map(([key, value]) => (
              <div key={key}>
                <dt>
                  {key === "city"
                    ? "Cidade"
                    : key === "country"
                      ? "País"
                      : key}
                </dt>
                <dd>{value || "(em branco)"}</dd>
              </div>
            ))}
          </dl>
          {preview.effectiveOptions.enrolments.length > 0 && (
            <>
              <p>
                Matrícula manual com papel Estudante nos cursos
                conferidos:
              </p>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Curso</th>
                      <th>Duração</th>
                      <th>Aviso de expiração</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.effectiveOptions.enrolments.map(
                      (enrolment) => (
                        <tr
                          key={`${enrolment.courseId}-${enrolment.enrolId}`}
                        >
                          <td>{enrolment.shortName}</td>
                          <td>
                            {enrolment.durationSeconds === 0
                              ? "Sem prazo"
                              : `${enrolment.durationSeconds / 86400} dias`}
                          </td>
                          <td>
                            {enrolment.expiryNotify
                              ? "Ativado"
                              : "Desativado"}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <p className="field-help">
            Exclusão, renomeação e suspensão de usuários estão
            desativadas.
          </p>
        </details>
      )}
      {preview.issues?.map((issue) => (
        <p className="field-help" key={issue.code}>
          {issue.message}
        </p>
      ))}
      <button
        type="button"
        className="primary"
        disabled={busy || !authenticated}
        onClick={() => {
          void onConfirm();
        }}
      >
        Confirmar cadastro de {preview.rows.length} alunos
      </button>
    </section>
  );
}

