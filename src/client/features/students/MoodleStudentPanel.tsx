"use client";
import type { ReactNode } from "react";
import { ChevronDown, CloudUpload, Eye, Loader2, Send } from "lucide-react";
import { MoodleConnection } from "../../components/moodle-connection.tsx";
import type { useMoodle } from "../../components/moodle-connection.tsx";
import type { StudentPreview } from "../../../domain/students/index.ts";
import { MoodleStudentConfirmation } from "./MoodleStudentConfirmation.tsx";
import { MoodleStudentResults } from "./MoodleStudentResults.tsx";
import type { MoodleStudentPreview, MoodleStudentResult } from "./schemas.ts";

export type MoodlePending = "preview" | "confirm" | null;

/**
 * The second way to finish: send to the teacher's Moodle. The card opens on the choice. What Moodle answers
 * (preview, then result) comes first; the connection and the preview button wait below it.
 */
export function MoodleStudentPanel({
  open,
  moodle,
  previews,
  previewIndex,
  busy,
  pending,
  unknownResult,
  hasPreview,
  onToggle,
  onDestinationsChange,
  onPreviewSelect,
  onPreview,
  children,
}: {
  open: boolean;
  moodle: ReturnType<typeof useMoodle>;
  previews: StudentPreview[];
  previewIndex: number;
  busy: boolean;
  pending: MoodlePending;
  unknownResult: boolean;
  hasPreview: boolean;
  onToggle: () => void;
  onDestinationsChange: (value: string) => void;
  onPreviewSelect: (index: number) => void;
  onPreview: () => Promise<void>;
  children?: ReactNode;
}) {
  const connected = Boolean(
    moodle.status?.authenticated && moodle.status.available,
  );
  // With a preview waiting for a decision, or a send under way, only that matters.
  const quiet = hasPreview || pending === "confirm";
  return (
    <section
      className={`stu-card stu-moodle${open ? " open" : ""}`}
      aria-label="Enviar ao Moodle"
    >
      <span className="stu-card-icon" aria-hidden="true">
        <CloudUpload size={32} />
      </span>
      <button
        type="button"
        className="primary stu-big"
        aria-expanded={open}
        aria-controls="student-moodle-body"
        onClick={onToggle}
      >
        <Send size={22} aria-hidden="true" />
        Enviar ao Moodle
        <ChevronDown size={20} className="stu-chevron" aria-hidden="true" />
      </button>
      <p className="stu-help">Cadastre direto no seu Moodle.</p>
      <div id="student-moodle-body" className="stu-moodle-body" hidden={!open}>
        {children}
        <div className="stu-moodle-controls" hidden={quiet}>
          <MoodleConnection moodle={moodle} />
          {connected && previews.length > 1 && (
            <label className="field">
              <span>Arquivo para enviar</span>
              <select
                value={previewIndex}
                onChange={(event) => {
                  onPreviewSelect(Number(event.target.value));
                }}
              >
                {previews.map((entry, index) => (
                  <option key={entry.hash} value={index}>
                    {entry.rows[0]?.course || `Arquivo ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>
          )}
          {connected && moodle.courses.length > 0 && (
            <label className="field">
              <span>Curso do Moodle</span>
              <select
                value=""
                onChange={(event) => {
                  onDestinationsChange(event.target.value);
                }}
              >
                <option value="">Escolher curso</option>
                {moodle.courses.map((course) => (
                  <option
                    key={course.id}
                    value={course.shortName ?? ""}
                    disabled={!course.shortName}
                  >
                    {course.title}
                    {course.shortName
                      ? ` (${course.shortName})`
                      : " — sem código"}
                  </option>
                ))}
              </select>
            </label>
          )}
          {connected && (
            <button
              type="button"
              className="primary"
              disabled={busy || unknownResult || previews.length === 0}
              onClick={() => {
                void onPreview();
              }}
            >
              {pending === "preview" ? (
                <Loader2 size={20} className="spinner" aria-hidden="true" />
              ) : (
                <Eye size={20} aria-hidden="true" />
              )}
              {pending === "preview" ? "Buscando prévia…" : "Ver prévia"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

/** Preview, confirmation and results of the Moodle operation; they open inside the Moodle card. */
export function MoodleStudentOutput({
  authenticated,
  busy,
  sending,
  preview,
  results,
  unknownResult,
  page,
  onPageChange,
  onConfirm,
}: {
  authenticated: boolean;
  busy: boolean;
  sending: boolean;
  preview: MoodleStudentPreview | null;
  results: MoodleStudentResult[];
  unknownResult: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onConfirm: () => Promise<void>;
}) {
  if (!preview && results.length === 0 && !unknownResult && !sending)
    return null;
  return (
    <div className="stu-output">
      {preview && (
        <MoodleStudentConfirmation
          preview={preview}
          page={page}
          busy={busy}
          authenticated={authenticated}
          onPageChange={onPageChange}
          onConfirm={onConfirm}
        />
      )}
      {sending && (
        <p className="stu-sending" role="status">
          <Loader2 size={22} className="spinner" aria-hidden="true" />
          Enviando ao Moodle…
        </p>
      )}
      {results.length > 0 && (
        <MoodleStudentResults
          results={results}
          page={page}
          onPageChange={onPageChange}
        />
      )}
      {unknownResult && (
        <p className="error-text stu-lock" role="alert">
          Não sabemos se terminou. Confira no Moodle antes de enviar de novo.
        </p>
      )}
    </div>
  );
}
