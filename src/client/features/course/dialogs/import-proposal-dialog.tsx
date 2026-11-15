"use client";
import { Modal } from "../../../components/modal.tsx";
import { ContentPreview } from "../../../components/content.tsx";
import type { CourseBuilderModel } from "../hooks/use-course-builder.ts";
import { issueLines } from "../helpers.ts";

type Props = Pick<
  CourseBuilderModel,
  "proposalTrigger" | "setProposal" | "project" | "openProject"
>
  & {
    proposal: NonNullable<CourseBuilderModel["proposal"]>;
  };

export function ImportProposalDialog({
  proposalTrigger,
  setProposal,
  proposal,
  project,
  openProject
}: Props) {
  // Só quizzes: o que chega são seções do Moodle com quizzes dentro, não uma disciplina.
  const quizOnly = proposal.project.draft.metadata.quizOnly === true;
  return (
    <Modal
      title={
        quizOnly
          ? "Conferir a proposta de quizzes"
          : "Conferir a proposta de disciplina"
      }
      returnFocus={proposalTrigger.current}
      onClose={() => setProposal(null)}
    >
      <h3>{proposal.project.draft.metadata.fullName}</h3>
      <p>
        {proposal.project.draft.sections.length}{" "}
        {quizOnly ? "seções" : "unidades"} ·{" "}
        {proposal.project.draft.sections.reduce(
          (sum, entry) => sum + entry.activities.length,
          0,
        )}{" "}
        {quizOnly ? "quizzes" : "atividades"} · {proposal.project.assets.length}{" "}
        arquivos
      </p>
      {project && (
        <p className="notice">
          A disciplina aberta será trocada na tela. Ela continua salva em
          Suas disciplinas.
        </p>
      )}
      {proposal.issues.map((issue, index) => (
        <p
          key={index}
          className={
            issue.severity === "error" ? "error-text" : "field-help"
          }
        >
          {issueLines([issue])}
        </p>
      ))}
      {proposal.preview.map((entry, index) => (
        <details key={index} className="form-details">
          <summary>Fonte: {entry.name}</summary>
          <ContentPreview
            blocks={entry.blocks}
            assets={proposal.project.assets}
          />
        </details>
      ))}
      <div className="button-row">
        <button
          type="button"
          className="secondary"
          onClick={() => setProposal(null)}
        >
          Voltar e ajustar
        </button>
        <button
          type="button"
          className="primary"
          onClick={() => {
            openProject(proposal.project);
            setProposal(null);
          }}
        >
          Abrir proposta no editor
        </button>
      </div>
    </Modal>
  );
}
