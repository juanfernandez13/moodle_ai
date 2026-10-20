"use client";
import { useEffect, useId, useRef } from "react";
import {
  ArrowLeft,
  ClipboardList,
  Info,
  ListChecks,
  LoaderCircle,
  Send,
  TriangleAlert,
} from "lucide-react";
import { checkUploadLimits } from "../../../../shared/upload-limits.ts";
import type { CourseBuilderModel } from "../hooks/use-course-builder.ts";
import { AiSelect } from "./ai-select.tsx";
import {
  DropZone,
  LIMITS_TEXT,
  MatrixRow,
  isSupported,
  plural,
  sameFile,
  useFileDragState,
} from "./upload-parts.tsx";

type Props = Pick<
  CourseBuilderModel,
  | "setSelectedFiles"
  | "selectedFiles"
  | "provider"
  | "setProvider"
  | "keys"
  | "setKeys"
  | "pasteText"
  | "setPasteText"
  | "busy"
  | "importDocuments"
> & {
  /** Colar o texto da matriz no lugar de enviar arquivos (o caminho fica no Importar JSON). */
  pasting: boolean;
  setPasting: (value: boolean) => void;
};

type Group = keyof Props["selectedFiles"];

/** Importar arquivos: a Matriz, as áreas de Tarefas e Quizzes e a coluna da IA com o botão principal. */
export function ImportFilesPanel({
  setSelectedFiles,
  selectedFiles,
  provider,
  setProvider,
  keys,
  setKeys,
  pasteText,
  setPasteText,
  busy,
  importDocuments,
  pasting,
  setPasting,
}: Props) {
  const { armed, stray } = useFileDragState();
  const reasonId = useId();
  const backed = useRef(false);

  // Ao voltar do texto para os arquivos, o foco vai para o botão da Matriz, que ocupa o lugar do link.
  useEffect(() => {
    if (!backed.current || pasting) return;
    backed.current = false;
    document.getElementById("upload-choose-matrix")?.focus();
  }, [pasting]);

  function receive(group: Group, incoming: File[]): string {
    const supported = incoming.filter(isSupported);
    const ignored = incoming.length - supported.length;
    const messages: string[] = [];
    if (ignored > 0)
      messages.push(
        `${ignored} ${plural(ignored, "arquivo ignorado", "arquivos ignorados")}: só Word, PDF ou texto.`,
      );
    if (group === "planning") {
      // A Matriz é um arquivo só: outro arquivo substitui o primeiro.
      const first = supported[0];
      if (first)
        setSelectedFiles((previous) => ({ ...previous, planning: [first] }));
      return messages.join(" ");
    }
    const current = selectedFiles[group];
    const fresh: File[] = [];
    for (const file of supported)
      if (![...current, ...fresh].some((other) => sameFile(other, file)))
        fresh.push(file);
    const repeated = supported.length - fresh.length;
    if (repeated > 0)
      messages.push(
        `${repeated} ${plural(repeated, "arquivo repetido", "arquivos repetidos")}.`,
      );
    if (fresh.length > 0)
      setSelectedFiles((previous) => ({
        ...previous,
        [group]: [...previous[group], ...fresh],
      }));
    return messages.join(" ");
  }
  function remove(group: Group, index: number) {
    setSelectedFiles((previous) => ({
      ...previous,
      [group]: previous[group].filter((_, position) => position !== index),
    }));
  }

  const matrix = selectedFiles.planning[0];
  const everyFile = [
    ...selectedFiles.planning,
    ...selectedFiles.tasks,
    ...selectedFiles.quizzes,
  ];
  // Mesma regra e mesma frase da conferência feita ao enviar.
  const problem =
    !pasting && everyFile.length > 0 ? checkUploadLimits(everyFile) : null;
  const hasSource = pasting ? pasteText.trim() !== "" : matrix !== undefined;
  // Uma linha só, a primeira coisa que falta. O botão fica desligado enquanto houver motivo.
  const reason =
    problem ??
    (!hasSource
      ? pasting
        ? "Cole o texto."
        : "Envie a matriz."
      : provider === null
        ? "Escolha uma IA."
        : "");
  const sending = busy === "import";

  return (
    <div className="entry-board" data-armed={armed || undefined}>
      <div className="entry-files-col">
        {pasting ? (
          <div className="entry-paste">
            <div className="entry-paste-head">
              <label className="entry-card-title" htmlFor="entry-paste">
                Texto da Matriz
              </label>
              <button
                type="button"
                className="entry-link"
                onClick={() => {
                  backed.current = true;
                  setPasting(false);
                }}
              >
                <ArrowLeft size={18} aria-hidden="true" />
                Voltar aos arquivos
              </button>
            </div>
            <textarea
              id="entry-paste"
              value={pasteText}
              onChange={(event) => setPasteText(event.target.value)}
            />
            {everyFile.length > 0 && (
              <p className="entry-note">Só o texto será lido.</p>
            )}
          </div>
        ) : (
          <>
            <MatrixRow
              file={matrix}
              onAdd={(files) => receive("planning", files)}
              onRemove={() => remove("planning", 0)}
            />
            <div className="entry-drops">
              <DropZone
                group="tasks"
                title="Tarefas"
                icon={<ClipboardList size={20} />}
                files={selectedFiles.tasks}
                onAdd={(files) => receive("tasks", files)}
                onRemove={(index) => remove("tasks", index)}
              />
              <DropZone
                group="quizzes"
                title="Quizzes"
                icon={<ListChecks size={20} />}
                files={selectedFiles.quizzes}
                onAdd={(files) => receive("quizzes", files)}
                onRemove={(index) => remove("quizzes", index)}
              />
            </div>
            <p
              className="entry-stray"
              aria-hidden="true"
              data-show={stray || undefined}
            >
              Solte em Tarefas ou Quizzes.
            </p>
          </>
        )}
      </div>
      <div className="entry-ai">
        <AiSelect
          provider={provider}
          setProvider={setProvider}
          keys={keys}
          setKeys={setKeys}
        />
        <div className="entry-action">
          <button
            type="button"
            className="primary entry-send"
            disabled={busy !== null || reason !== ""}
            aria-describedby={reasonId}
            onClick={(event) => void importDocuments(pasting, event.currentTarget)}
          >
            {sending ? (
              <LoaderCircle className="spinner" size={20} aria-hidden="true" />
            ) : (
              <Send size={20} aria-hidden="true" />
            )}
            {sending ? "Enviando…" : "Enviar para análise"}
          </button>
          {/* Sempre no lugar, para a tela não pular quando o motivo some. */}
          <p
            className="entry-reason"
            id={reasonId}
            aria-live="polite"
            aria-atomic="true"
            data-problem={problem !== null || undefined}
          >
            {reason !== "" &&
              (problem !== null ? (
                <TriangleAlert size={16} aria-hidden="true" />
              ) : (
                <Info size={16} aria-hidden="true" />
              ))}
            {reason}
          </p>
          {!pasting && <p className="entry-limits">{LIMITS_TEXT}</p>}
        </div>
      </div>
    </div>
  );
}
