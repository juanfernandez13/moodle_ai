"use client";
import { MoodleConnection } from "../../components/moodle-connection.tsx";
import type { useMoodle } from "../../components/moodle-connection.tsx";
import type { StudentPreview } from "../../../domain/students/index.ts";
import { MoodleStudentConfirmation } from "./MoodleStudentConfirmation.tsx";
import { MoodleStudentResults } from "./MoodleStudentResults.tsx";
import type { MoodleStudentPreview, MoodleStudentResult } from "./schemas.ts";

export function MoodleStudentPanel({
  visible,
  moodle,
  previews,
  previewIndex,
  busy,
  preview,
  results,
  unknownResult,
  page,
  onPageChange,
  onDestinationsChange,
  onPreviewSelect,
  onPreview,
  onConfirm,
}: {
  visible: boolean;
  moodle: ReturnType<typeof useMoodle>;
  previews: StudentPreview[];
  previewIndex: number;
  busy: boolean;
  preview: MoodleStudentPreview | null;
  results: MoodleStudentResult[];
  unknownResult: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onDestinationsChange: (value: string) => void;
  onPreviewSelect: (index: number) => void;
  onPreview: () => Promise<void>;
  onConfirm: () => Promise<void>;
}) {
  return (
    <section hidden={!visible}>
      <MoodleConnection moodle={moodle} />
      {moodle.courses.length > 0 && (
        <label className="field">
          <span>Usar um curso do Moodle para todo o lote</span>
          <select
            value=""
            onChange={(event) => {
              onDestinationsChange(event.target.value);
            }}
          >
            <option value="">Selecione um curso</option>
            {moodle.courses.map((course) => (
              <option
                key={course.id}
                value={course.shortName ?? ""}
                disabled={!course.shortName}
              >
                {course.title}
                {course.shortName
                  ? ` (${course.shortName})`
                  : " — sem nome curto disponível"}
              </option>
            ))}
          </select>
        </label>
      )}
      {previews.length > 1 && (
        <label className="field">
          <span>CSV para conferir no Moodle</span>
          <select
            value={previewIndex}
            onChange={(event) => {
              onPreviewSelect(Number(event.target.value));
            }}
          >
            {previews.map((entry, index) => (
              <option key={entry.hash} value={index}>
                {entry.rows[0]?.course || `Lote ${index + 1}`}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="tool-warning">
        A primeira etapa envia somente o CSV à prévia Moodle. Criar ou
        atualizar alunos exige confirmar a prévia atual.
      </div>
      <button
        type="button"
        className="secondary"
        disabled={
          busy ||
          unknownResult ||
          previews.length === 0 ||
          !moodle.status?.authenticated ||
          !moodle.status.available
        }
        onClick={() => {
          void onPreview();
        }}
      >
        Conferir cadastro no Moodle
      </button>
      {preview && <MoodleStudentConfirmation
        preview={preview}
        page={page}
        busy={busy}
        authenticated={Boolean(moodle.status?.authenticated)}
        onPageChange={onPageChange}
        onConfirm={onConfirm}
      />}
      {results.length > 0 && <MoodleStudentResults results={results} page={page} onPageChange={onPageChange} />}
      {unknownResult && (
        <p className="error-text">
          Há resultado desconhecido. O reenvio está bloqueado nesta sessão;
          confira os usuários no Moodle antes de uma nova operação.
        </p>
      )}
    </section>
  );
}

