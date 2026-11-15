"use client";
import { useEffect, useRef, useState } from "react";
import { Trash2, TriangleAlert, Upload } from "lucide-react";
import { Modal } from "../../../components/modal.tsx";
import { projectIdentity } from "../../../project.ts";
import type { CourseBuilderModel } from "../hooks/use-course-builder.ts";

type Props = Pick<
  CourseBuilderModel,
  | "setShowProjects"
  | "projects"
  | "project"
  | "openSaved"
  | "removeSaved"
  | "proposalTrigger"
  | "portableInput"
>;

/**
 * "Seus cursos": os cursos guardados neste navegador. Cada um pode ser reaberto ou excluído.
 * Excluir pede uma confirmação na própria linha (não dá para desfazer) e o foco começa no "Cancelar".
 * O curso que está aberto agora não pode ser excluído daqui: ele seria salvo de novo na próxima alteração.
 */
export function SavedProjectsDialog({
  setShowProjects,
  projects,
  project,
  openSaved,
  removeSaved,
  proposalTrigger,
  portableInput,
}: Props) {
  // Curso cuja exclusão espera a confirmação; null: nenhuma.
  const [asking, setAsking] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [failure, setFailure] = useState("");
  const cancelRef = useRef<HTMLButtonElement>(null);
  const portableRef = useRef<HTMLButtonElement>(null);
  const openId = project ? projectIdentity(project) : null;

  useEffect(() => {
    if (asking !== null) cancelRef.current?.focus();
  }, [asking]);

  async function remove(id: string) {
    setRemoving(true);
    setFailure("");
    try {
      await removeSaved(id);
      setAsking(null);
      // A linha sumiu: o foco vai para um botão que continua na janela.
      portableRef.current?.focus();
    } catch (error) {
      setFailure(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir esta disciplina.",
      );
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Modal title="Suas disciplinas" onClose={() => setShowProjects(false)}>
      {projects.length === 0 ? (
        <p>Nenhuma disciplina salva ainda.</p>
      ) : (
        projects.map((entry) => {
          const id = projectIdentity(entry);
          const name = entry.draft.metadata.fullName;
          const units = entry.draft.sections.length;
          return (
            <div className="preset-row" key={id}>
              <span>
                <strong>{name}</strong>
                <small>
                  {asking === id
                    ? "Excluir esta disciplina? Não dá para desfazer."
                    : `${units} ${units === 1 ? "unidade" : "unidades"}${id === openId ? " · aberta agora" : ""}`}
                </small>
              </span>
              {asking === id ? (
                // "Cancelar" fica onde estava o "Excluir": um clique duplo sem querer cancela, nunca apaga.
                <span className="saved-actions" key="confirm">
                  <button
                    type="button"
                    key="confirm-remove"
                    className="secondary saved-remove"
                    aria-label={`Excluir ${name} de vez`}
                    aria-disabled={removing || undefined}
                    onClick={() => {
                      if (!removing) void remove(id);
                    }}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                    {removing ? "Excluindo…" : "Sim, excluir"}
                  </button>
                  <button
                    type="button"
                    key="confirm-cancel"
                    className="secondary"
                    ref={cancelRef}
                    disabled={removing}
                    onClick={() => setAsking(null)}
                  >
                    Cancelar
                  </button>
                </span>
              ) : (
                <span className="saved-actions" key="actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      void openSaved(id);
                    }}
                  >
                    Reabrir
                  </button>
                  {id !== openId && (
                    <button
                      type="button"
                      className="secondary saved-remove"
                      aria-label={`Excluir ${name}`}
                      onClick={() => {
                        setFailure("");
                        setAsking(id);
                      }}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                      Excluir
                    </button>
                  )}
                </span>
              )}
            </div>
          );
        })
      )}
      <div role="alert">
        {failure && (
          <p className="saved-failure">
            <TriangleAlert size={16} aria-hidden="true" />
            {failure}
          </p>
        )}
      </div>
      <button
        type="button"
        className="text-button"
        ref={portableRef}
        onClick={(event) => {
          proposalTrigger.current = event.currentTarget;
          portableInput.current?.click();
        }}
      >
        <Upload size={16} aria-hidden="true" />
        Abrir cópia salva
      </button>
    </Modal>
  );
}
