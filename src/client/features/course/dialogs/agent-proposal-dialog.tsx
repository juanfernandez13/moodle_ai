"use client";
import { Modal } from "../../../components/modal.tsx";
import { projectIdentity } from "../../../project.ts";
import type { CourseBuilderModel } from "../hooks/use-course-builder.ts";

type Props = Pick<
  CourseBuilderModel,
  "setAgentProposal" | "project" | "setError" | "commands"
>
  & {
    agentProposal: NonNullable<CourseBuilderModel["agentProposal"]>;
  };

export function AgentProposalDialog({
  setAgentProposal,
  agentProposal,
  project,
  setError,
  commands
}: Props) {
  return (
    <Modal
      title="Alterações propostas pelo agente"
      onClose={() => setAgentProposal(null)}
    >
      <p>
        Revisão de origem: {agentProposal.expectedRevision}. Confira antes
        de aplicar.
      </p>
      <ul>
        {agentProposal.summary.map((entry, index) => (
          <li key={index}>{entry}</li>
        ))}
      </ul>
      <button
        type="button"
        className="primary"
        onClick={() => {
          if (
            !project ||
            projectIdentity(project) !== agentProposal.projectId
          ) {
            setError(
              "O projeto da proposta mudou. Solicite uma proposta para o projeto atual.",
            );
            setAgentProposal(null);
            return;
          }
          commands(agentProposal.commands, agentProposal.expectedRevision);
          setAgentProposal(null);
        }}
      >
        Aplicar alterações conferidas
      </button>
    </Modal>
  );
}
