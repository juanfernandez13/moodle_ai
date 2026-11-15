"use client";
import { ArrowLeft, Check, Download } from "lucide-react";
import { useCalmText } from "../../../components/calm-text.ts";
import { Trail } from "../../../components/trail.tsx";
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
  & {
    project: CourseProject;
    /** The course file has been generated: the last step of the trail is the one that is open. */
    fileReady: boolean;
  };

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
  fileReady,
}: Props) {
  // "Salvando…" e "Salvo" mudam a cada tecla: o leitor de tela só fala o texto final, quando a pessoa para de digitar.
  const failed = saveState.startsWith("Não salvo");
  const calmState = useCalmText(saveState.startsWith("Salvando") ? "" : saveState);
  function back() {
    setProject(null);
    setError("");
    setMessage("Sua disciplina ficou salva em Suas disciplinas.");
  }
  return (
    <header className="editor-heading surface-panel">
      <div className="title-with-back">
        <button type="button" className="editor-back" onClick={back}>
          <ArrowLeft size={18} aria-hidden="true" />
          Voltar
        </button>
        <div className="editor-title-text">
          <h1>{project.draft.metadata.fullName || "Disciplina sem nome"}</h1>
          <p className={`save-state ${failed ? "error-text" : ""}`}>
            {saveState}
          </p>
          <span className="visually-hidden" role="status">
            {failed ? "" : calmState}
          </span>
          {failed && (
            <span className="visually-hidden" role="alert">
              {saveState}
            </span>
          )}
        </div>
      </div>
      {/* O mesmo passo a passo da entrada: aqui é a Revisão, e o primeiro passo volta para ela. */}
      <Trail
        className="editor-steps"
        label="Etapas"
        steps={[
          {
            id: "start",
            label: project.sources.length > 0 ? "Arquivos" : "Dados",
            state: "done",
            onGo: back,
          },
          {
            id: "review",
            label: "Revisão",
            state: fileReady ? "done" : "current",
          },
          {
            id: "download",
            label: "Baixar",
            state: fileReady ? "current" : "todo",
          },
        ]}
      />
      <div className="editor-tools">
        <button
          type="button"
          className="secondary"
          disabled={busy !== null}
          onClick={() => {
            void portable();
          }}
        >
          <Download size={17} aria-hidden="true" />
          Salvar cópia
        </button>
        {/* Com o arquivo pronto, o botão principal da etapa é "Baixar curso (.mbz)": este passa a ser secundário. */}
        <button
          type="button"
          className={fileReady ? "secondary" : "primary"}
          onClick={() => {
            setShowReview(true);
            setValidatedRevision(
              issues.some((issue) => issue.severity === "error")
                ? null
                : project.draft.revision,
            );
          }}
        >
          <Check size={18} aria-hidden="true" />
          {project.draft.metadata.quizOnly === true
            ? "Conferir quizzes"
            : "Conferir disciplina"}
        </button>
      </div>
    </header>
  );
}
