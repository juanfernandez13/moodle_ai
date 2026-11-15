"use client";
import { useEffect, useId, useRef } from "react";
import {
  ArrowLeft,
  ClipboardList,
  ListChecks,
  LoaderCircle,
  Send,
  TriangleAlert,
} from "lucide-react";
import { assignTargets } from "../../../../shared/quiz-targets.ts";
import { checkUploadLimits } from "../../../../shared/upload-limits.ts";
import { quizSectionTitle } from "../../../project.ts";
import type { CourseBuilderModel } from "../hooks/use-course-builder.ts";
import { AiSelect, useAiChoices } from "./ai-select.tsx";
import {
  DropZone,
  MatrixRow,
  extensionOf,
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
  | "aiProblem"
  | "pasteText"
  | "setPasteText"
  | "busy"
  | "controller"
  | "importDocuments"
> & {
  /** Só quizzes: sem Matriz nem tarefas, só os quizzes para mesclar numa disciplina que já existe. */
  quizzesOnly: boolean;
  /** Colar o texto da Matriz no lugar de enviar arquivos (o caminho fica no Importar JSON). */
  pasting: boolean;
  setPasting: (value: boolean) => void;
  /** Sem chave de IA, o caminho é criar o curso manualmente. */
  onManual: () => void;
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
  aiProblem,
  pasteText,
  setPasteText,
  busy,
  controller,
  importDocuments,
  quizzesOnly,
  pasting: pastingText,
  setPasting,
  onManual,
}: Props) {
  // Colar o texto é um caminho da Matriz: em Só quizzes ele não existe.
  const pasting = pastingText && !quizzesOnly;
  const { armed, stray } = useFileDragState();
  const choices = useAiChoices(keys);
  const reasonId = useId();
  const backed = useRef(false);
  const sendRef = useRef<HTMLButtonElement>(null);

  // Ao voltar do texto para os arquivos, o foco vai para o botão da Matriz, que ocupa o lugar do link.
  useEffect(() => {
    if (!backed.current || pasting) return;
    backed.current = false;
    document.getElementById("upload-choose-matrix")?.focus();
  }, [pasting]);

  function receive(group: Group, incoming: File[]): string {
    const supported = incoming.filter(isSupported);
    const messages: string[] = [];
    // Word antigo tem aviso próprio: para quem dá aula, ".doc" é Word, e o aviso diz o que fazer.
    const old = incoming.filter((file) => extensionOf(file.name) === "doc");
    if (old.length > 0) messages.push("Word antigo (.doc): salve como .docx.");
    const ignored = incoming.length - supported.length - old.length;
    if (ignored > 0)
      messages.push(
        `${ignored} ${plural(ignored, "arquivo ignorado", "arquivos ignorados")}: só .docx, .pdf ou .txt.`,
      );
    if (group === "planning") {
      // A Matriz é um arquivo só: outro arquivo substitui o primeiro.
      const first = supported[0];
      if (supported.length > 1)
        messages.push("A Matriz é um arquivo só: ficou o primeiro.");
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

  // Só quizzes: a seção de cada arquivo sai do nome dele, pela mesma regra que o servidor usa ao montar o pacote.
  const targets = new Map(
    quizzesOnly
      ? assignTargets(selectedFiles.quizzes).map((item) => [item.file, item.target] as const)
      : [],
  );
  const matrix = selectedFiles.planning[0];
  // Só quizzes envia apenas os quizzes; a Matriz e as tarefas que sobraram na tela ficam de fora.
  const everyFile = quizzesOnly
    ? selectedFiles.quizzes
    : [
        ...selectedFiles.planning,
        ...selectedFiles.tasks,
        ...selectedFiles.quizzes,
      ];
  // Mesma regra e mesma frase da conferência feita ao enviar.
  const problem =
    !pasting && everyFile.length > 0 ? checkUploadLimits(everyFile) : null;
  const hasSource = quizzesOnly
    ? selectedFiles.quizzes.length > 0
    : pasting
      ? pasteText.trim() !== ""
      : matrix !== undefined;
  // Sem nenhuma IA com chave (e o servidor já respondeu) não há o que escolher: o caminho é criar o curso manualmente.
  const noKey = choices.server !== null && choices.options.length === 0;
  const lacksKey = provider === null && noKey;
  // Uma linha só, a primeira coisa que falta. O botão fica desligado enquanto houver motivo.
  const reason =
    problem ??
    (lacksKey
      ? "Cadastre uma IA."
      : !hasSource
        ? pasting
          ? "Cole o texto."
          : quizzesOnly
            ? "Envie os quizzes."
            : "Envie a Matriz."
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
            {!quizzesOnly && (
              <MatrixRow
                file={matrix}
                onAdd={(files) => receive("planning", files)}
                onRemove={() => remove("planning", 0)}
              />
            )}
            <div className="entry-drops" data-solo={quizzesOnly || undefined}>
              {!quizzesOnly && (
                <DropZone
                  group="tasks"
                  title="Tarefas"
                  icon={<ClipboardList size={20} />}
                  files={selectedFiles.tasks}
                  onAdd={(files) => receive("tasks", files)}
                  onRemove={(index) => remove("tasks", index)}
                />
              )}
              <DropZone
                group="quizzes"
                title="Quizzes"
                icon={<ListChecks size={20} />}
                required={quizzesOnly}
                hint={
                  quizzesOnly
                    ? "O número no nome (“Quiz 3”) escolhe a seção."
                    : undefined
                }
                badge={
                  quizzesOnly
                    ? (file) => {
                        const target = targets.get(file);
                        return target === undefined
                          ? undefined
                          : quizSectionTitle(target);
                      }
                    : undefined
                }
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
              {quizzesOnly
                ? "Solte em Quizzes."
                : "Solte em Matriz, Tarefas ou Quizzes."}
            </p>
          </>
        )}
      </div>
      {/* A coruja pergunta pela IA (e diz o que fazer sem chave); o cartão embaixo dela tem a escolha e o botão principal. */}
      <AiSelect
        provider={provider}
        setProvider={setProvider}
        keys={keys}
        setKeys={setKeys}
        choices={choices}
        problem={aiProblem}
        onManual={onManual}
      >
        <div className="entry-action">
          {/* Esperando a resposta o botão não é "disabled" (o foco sairia dele): fica com aria-disabled e não envia de novo. */}
          <button
            ref={sendRef}
            type="button"
            className="primary entry-send"
            disabled={reason !== ""}
            aria-disabled={busy !== null ? true : undefined}
            aria-describedby={reasonId}
            onClick={(event) => {
              if (busy !== null) return;
              void importDocuments(
                pasting,
                event.currentTarget,
                quizzesOnly ? "quizzes" : "course",
              );
            }}
          >
            {sending ? (
              <LoaderCircle className="spinner" size={20} aria-hidden="true" />
            ) : (
              <Send size={20} aria-hidden="true" />
            )}
            {sending ? "Enviando…" : "Enviar para análise"}
          </button>
          {/* Sempre no lugar, para a tela não pular quando o motivo some. Uma frase curta: o que falta para o botão ligar. */}
          <p
            className="entry-reason"
            id={reasonId}
            aria-live="polite"
            aria-atomic="true"
            data-problem={problem !== null || undefined}
          >
            {sending ? (
              <>
                {pasting
                  ? "Lendo o texto…"
                  : quizzesOnly
                    ? "Lendo os quizzes…"
                    : "Lendo a Matriz…"}{" "}
                pode levar um minuto.
              </>
            ) : (
              <>
                {problem !== null && (
                  <TriangleAlert size={16} aria-hidden="true" />
                )}
                <span>{reason}</span>
              </>
            )}
          </p>
          {sending && (
            <button
              type="button"
              className="entry-btn entry-cancel"
              onClick={() => {
                controller.current?.abort();
                sendRef.current?.focus();
              }}
            >
              Cancelar
            </button>
          )}
        </div>
      </AiSelect>
    </div>
  );
}
