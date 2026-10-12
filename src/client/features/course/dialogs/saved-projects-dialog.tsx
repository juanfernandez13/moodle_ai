"use client";
import { Upload } from "lucide-react";
import { Modal } from "../../../components/modal.tsx";
import { projectIdentity } from "../../../project.ts";
import type { CourseBuilderModel } from "../hooks/use-course-builder.ts";

type Props = Pick<
  CourseBuilderModel,
  "setShowProjects" | "projects" | "openSaved" | "proposalTrigger" | "portableInput"
>;

export function SavedProjectsDialog({
  setShowProjects,
  projects,
  openSaved,
  proposalTrigger,
  portableInput
}: Props) {
  return (
    <Modal
      title="Projetos salvos neste navegador"
      onClose={() => setShowProjects(false)}
    >
      {projects.length === 0 ? (
        <p>
          Nenhum curso salvo ainda. Crie um curso ou importe uma cópia
          portátil.
        </p>
      ) : (
        projects.map((entry) => (
          <div className="preset-row" key={projectIdentity(entry)}>
            <span>
              <strong>{entry.draft.metadata.fullName}</strong>
              <small>
                Revisão {entry.draft.revision} ·{" "}
                {entry.draft.sections.length} unidades
              </small>
            </span>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                void openSaved(projectIdentity(entry));
              }}
            >
              Reabrir
            </button>
          </div>
        ))
      )}
      <button
        type="button"
        className="text-button"
        onClick={(event) => {
          proposalTrigger.current = event.currentTarget;
          portableInput.current?.click();
        }}
      >
        <Upload size={16} />
        Importar cópia portátil
      </button>
    </Modal>
  );
}
