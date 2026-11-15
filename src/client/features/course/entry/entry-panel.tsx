"use client";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import {
  ArrowLeft,
  Copy,
  FileJson,
  FolderOpen,
  Hand,
  ListChecks,
  Upload,
} from "lucide-react";
import { Trail } from "../../../components/trail.tsx";
import type { CourseBuilderModel } from "../hooks/use-course-builder.ts";
import { ImportFilesPanel } from "./import-files-panel.tsx";
import { ManualCourseForm } from "./manual-course-form.tsx";
import { JsonImportPanel } from "./json-import-panel.tsx";

type Props = Pick<
  CourseBuilderModel,
  | "entry"
  | "setEntry"
  | "setError"
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
  | "name"
  | "firstSection"
  | "openProject"
  | "setName"
  | "setFirstSection"
  | "jsonText"
  | "setJsonText"
  | "importJson"
  | "example"
  | "setShowPrompt"
  | "setShowProjects"
  | "projects"
  | "proposalTrigger"
  | "portableInput"
> & {
  /** The class of the page turn, while this page comes in. */
  turnClass?: string | undefined;
};

// Só três caminhos no alto da tela (abas, como no design system); o JSON abre pelo rodapé e volta pelo "Voltar".
// O terceiro texto é o rótulo curto, para o celular, onde três abas com o rótulo inteiro não cabem.
const MODES = [
  ["files", "Importar arquivos", Upload, "Arquivos"],
  ["manual", "Criar manualmente", Hand, "Manual"],
  ["quizzes", "Só quizzes", ListChecks, "Quizzes"],
] as const;
// Sem arquivos não há "Arquivos": criar manualmente começa pelos dados.
const STEP_NAMES = {
  files: ["Arquivos", "Revisão", "Baixar"],
  quizzes: ["Arquivos", "Revisão", "Baixar"],
  json: ["Arquivos", "Revisão", "Baixar"],
  manual: ["Dados", "Revisão", "Baixar"],
} as const;

export function EntryPanel({
  entry,
  setEntry,
  setError,
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
  name,
  firstSection,
  openProject,
  setName,
  setFirstSection,
  jsonText,
  setJsonText,
  importJson,
  example,
  setShowPrompt,
  setShowProjects,
  projects,
  proposalTrigger,
  portableInput,
  turnClass,
}: Props) {
  // Colar o texto da matriz: o caminho começa no Importar JSON, mas o texto é lido pela mesma tela e pela mesma IA.
  const [pasting, setPasting] = useState(false);
  // Ao trocar de tela por um link, o botão que foi clicado some: o foco vai para onde a pessoa continua.
  const focusAfter = useRef<string | null>(null);
  useEffect(() => {
    const id = focusAfter.current;
    if (id === null) return;
    focusAfter.current = null;
    document.getElementById(id)?.focus();
  }, [entry]);

  function selectMode(mode: Props["entry"], focusId?: string) {
    if (focusId) focusAfter.current = focusId;
    setEntry(mode);
    setError("");
  }
  function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = MODES.length - 1;
    const target =
      event.key === "ArrowRight"
        ? index === last ? 0 : index + 1
        : event.key === "ArrowLeft"
          ? index === 0 ? last : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : -1;
    if (target < 0) return;
    event.preventDefault();
    const next = MODES[target]![0];
    selectMode(next);
    document.getElementById(`tab-${next}`)?.focus();
  }

  const json = entry === "json";
  const manual = entry === "manual";
  const quizzes = entry === "quizzes";
  const viewProps = json
    ? { "aria-labelledby": "entry-title" }
    : {
        id: `panel-${entry}`,
        role: "tabpanel",
        "aria-labelledby": `tab-${entry}`,
      };

  return (
    <main
      className={`entry-panel surface-panel${turnClass ? ` ${turnClass}` : ""}`}
      data-entry={entry}
    >
      <div className="entry-top">
        <h1 id="entry-title" className="entry-title">
          {json ? "Importar JSON" : quizzes ? "Criar quizzes" : "Criar disciplina"}
        </h1>
        {json ? (
          <button
            type="button"
            className="entry-back"
            onClick={() => selectMode("files", "entry-open-json")}
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Voltar
          </button>
        ) : (
          <div
            className="entry-modes"
            role="tablist"
            aria-label="Como começar"
            data-active={entry}
          >
            {MODES.map(([value, label, Icon, short], index) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={entry === value}
                aria-controls={entry === value ? `panel-${value}` : undefined}
                id={`tab-${value}`}
                tabIndex={entry === value ? 0 : -1}
                onKeyDown={(event) => moveTab(event, index)}
                onClick={() => selectMode(value)}
              >
                <Icon size={16} aria-hidden="true" />
                <span className="entry-tab-full">{label}</span>
                <span className="entry-tab-short">{short}</span>
              </button>
            ))}
          </div>
        )}
        <Trail
          className="entry-steps"
          label="Etapas"
          steps={STEP_NAMES[entry].map((label, index) => ({
            id: label,
            label,
            state: index === 0 ? "current" : "todo",
          }))}
        />
        {/* Cursos que este navegador guarda: sem este caminho, um curso salvo não teria como ser reaberto. */}
        {projects.length > 0 && (
          <button
            type="button"
            className="entry-link entry-courses"
            onClick={() => setShowProjects(true)}
          >
            <FolderOpen size={18} aria-hidden="true" />
            Suas disciplinas ({projects.length})
          </button>
        )}
      </div>
      <section className="entry-view" {...viewProps}>
        {(entry === "files" || quizzes) && (
          <ImportFilesPanel
            quizzesOnly={quizzes}
            setSelectedFiles={setSelectedFiles}
            selectedFiles={selectedFiles}
            provider={provider}
            setProvider={setProvider}
            keys={keys}
            setKeys={setKeys}
            aiProblem={aiProblem}
            pasteText={pasteText}
            setPasteText={setPasteText}
            busy={busy}
            controller={controller}
            importDocuments={importDocuments}
            pasting={pasting}
            setPasting={setPasting}
            onManual={() => selectMode("manual")}
          />
        )}
        {manual && (
          <ManualCourseForm
            name={name}
            firstSection={firstSection}
            setError={setError}
            openProject={openProject}
            setName={setName}
            setFirstSection={setFirstSection}
          />
        )}
        {json && (
          <JsonImportPanel
            jsonText={jsonText}
            setJsonText={setJsonText}
            importJson={importJson}
            example={example}
            setShowPrompt={setShowPrompt}
            proposalTrigger={proposalTrigger}
            portableInput={portableInput}
            onPasteText={() => {
              setPasting(true);
              selectMode("files", "entry-paste");
            }}
          />
        )}
      </section>
      {!json && (
        <div className="entry-footer">
          <button
            type="button"
            id="entry-open-json"
            className="entry-link"
            onClick={() => selectMode("json", "entry-json")}
          >
            <FileJson size={18} aria-hidden="true" />
            Importar JSON
          </button>
          {/* O prompt é para quem usa outra IA com a Matriz; criar manualmente e só quizzes não o usam. */}
          {!manual && !quizzes && (
            <button
              type="button"
              className="entry-link"
              onClick={() => setShowPrompt(true)}
            >
              <Copy size={18} aria-hidden="true" />
              Copiar prompt
            </button>
          )}
        </div>
      )}
    </main>
  );
}
