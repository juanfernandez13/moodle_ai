"use client";
import { Modal } from "../../../components/modal.tsx";
import { ContentPreview } from "../../../components/content.tsx";
import type { CourseBuilderModel } from "../hooks/use-course-builder.ts";

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
  return (
    <Modal
      title="Conferir a proposta de curso"
      returnFocus={proposalTrigger.current}
      onClose={() => setProposal(null)}
    >
      <h3>{proposal.project.draft.metadata.fullName}</h3>
      <p>
        {proposal.project.draft.sections.length} unidades ·{" "}
        {proposal.project.draft.sections.reduce(
          (sum, entry) => sum + entry.activities.length,
          0,
        )}{" "}
        atividades · {proposal.project.assets.length} arquivos
      </p>
      {project && (
        <p className="notice">
          O curso aberto será substituído na tela. A versão salva neste
          navegador continua em Projetos salvos.
        </p>
      )}
      {proposal.issues.map((issue, index) => (
        <p
          key={index}
          className={
            issue.severity === "error" ? "error-text" : "field-help"
          }
        >
          {issue.path}: {issue.message}
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
