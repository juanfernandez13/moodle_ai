"use client";
import { Download } from "lucide-react";
import type { CourseProject } from "../../project.ts";
import { downloadFile } from "../../download.ts";
import type { CourseBuilderModel } from "./hooks/use-course-builder.ts";

type Props = {
  project: CourseProject;
  artifact: NonNullable<CourseBuilderModel["artifact"]>;
};

export function DeliveryPanel({ artifact, project }: Props) {
  return (
    <section className="delivery surface-panel">
      <div>
        <p className="subtle">Backup pronto</p>
        <h2>Seu curso está preparado para baixar</h2>
        <p>
          Revisão {artifact.revision}
          {project.draft.revision !== artifact.revision
            ? ` · o editor está na revisão ${project.draft.revision}`
            : ""}
          . O pacote mantém a revisão que foi conferida.
        </p>
        <p className="field-help">
          Restaure em um curso novo e vazio no laboratório local. Perfil
          testado em Moodle 4.1.17, build 20250317; outras versões não foram
          verificadas.
        </p>
      </div>
      {artifact.glossaryUserinfo && (
        <p className="notice">
          Para preservar as entradas de glossário, mantenha “Informação de
          usuário” habilitada na restauração desse módulo. O pacote não
          contém contas ou matrículas; as entradas ficam sem autor.
        </p>
      )}
      <button
        type="button"
        className="primary"
        onClick={() =>
          downloadFile(artifact.bytes, artifact.name, "application/gzip")
        }
      >
        <Download size={18} />
        Baixar curso MBZ
      </button>
    </section>
  );
}
