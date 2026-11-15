"use client";
import { useId } from "react";
import { Download } from "lucide-react";
import type { CourseProject } from "../../project.ts";
import { downloadFile } from "../../download.ts";
import type { CourseBuilderModel } from "./hooks/use-course-builder.ts";

type Props = {
  project: CourseProject;
  artifact: NonNullable<CourseBuilderModel["artifact"]>;
  /** The class of the page turn, while this page comes in. */
  turnClass?: string | undefined;
};

export function DeliveryPanel({ artifact, project, turnClass }: Props) {
  const titleId = useId();
  // O arquivo guarda o curso como estava quando foi conferido: o que a pessoa mudou depois não entra nele.
  const changed = project.draft.revision !== artifact.revision;
  // Só quizzes: o arquivo entra numa disciplina que já existe, e a opção de restaurar errada apaga o conteúdo dela.
  const quizOnly = project.draft.metadata.quizOnly === true;
  return (
    <section
      className={`delivery surface-panel${turnClass ? ` ${turnClass}` : ""}`}
      aria-labelledby={titleId}
    >
      <div>
        <h2 id={titleId}>
          {quizOnly ? "Seus quizzes estão prontos!" : "Sua disciplina está pronta!"}
        </h2>
        <p>
          {changed
            ? "Você mudou a disciplina depois. O arquivo não tem essas mudanças."
            : "É o arquivo que o Moodle sabe restaurar."}
        </p>
        {quizOnly && (
          <ol className="delivery-steps">
            <li>Na disciplina, abra Mais → Reutilização de curso → Restaurar.</li>
            <li>
              Escolha mesclar com este curso. Nunca a opção que exclui o
              conteúdo.
            </li>
            <li>Depois, no livro de notas, coloque cada quiz na categoria certa.</li>
          </ol>
        )}
        <p className="field-help">Testado no Moodle 4.1 (laboratório).</p>
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
        <Download size={18} aria-hidden="true" />
        {quizOnly ? "Baixar quizzes (.mbz)" : "Baixar disciplina (.mbz)"}
      </button>
    </section>
  );
}
