"use client";
import { Check, Download, ArrowLeft } from "lucide-react";
import type { CourseProject } from "../../../project.ts";
import type { CourseBuilderModel } from "../hooks/use-course-builder.ts";

type Props = Pick<
  CourseBuilderModel,
  "setProject"
  | "setError"
  | "setMessage"
  | "saveState"
  | "busy"
  | "portable"
  | "setShowReview"
  | "setValidatedRevision"
  | "issues"
>
  & { project: CourseProject; };

export function EditorHeader({
  setProject,
  setError,
  setMessage,
  project,
  saveState,
  busy,
  portable,
  setShowReview,
  setValidatedRevision,
  issues,
}: Props) {
  return (
    <header className="editor-heading surface-panel">
      <div className="title-with-back">
        <button
          type="button"
          className="icon-button"
          aria-label="Voltar à entrada mantendo o curso salvo"
          onClick={() => {
            setProject(null);
            setError("");
            setMessage(
              "Seu curso salvo pode ser reaberto em Projetos salvos.",
            );
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div className="editor-title-text">
          <h1>{project.draft.metadata.fullName || "Curso sem nome"}</h1>
          <p
            className={`save-state ${saveState.startsWith("Não salvo") ? "error-text" : ""}`}
            role="status"
          >
            {saveState}
          </p>
        </div>
      </div>
      <div className="editor-tools">
        <button
          type="button"
          className="secondary"
          disabled={busy !== null}
          onClick={() => {
            void portable();
          }}
        >
          <Download size={17} />
          Salvar cópia
        </button>
        <button
          type="button"
          className="primary"
          onClick={() => {
            setShowReview(true);
            setValidatedRevision(
              issues.some((issue) => issue.severity === "error")
                ? null
                : project.draft.revision,
            );
          }}
        >
          <Check size={18} />
          Conferir curso
        </button>
      </div>
    </header>
  );
}
