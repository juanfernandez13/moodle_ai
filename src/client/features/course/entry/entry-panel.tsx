"use client";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { ArrowLeft, Copy, FileJson, Hand, Upload } from "lucide-react";
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
  | "pasteText"
  | "setPasteText"
  | "busy"
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
  | "proposalTrigger"
  | "portableInput"
>;

// Só dois caminhos no alto da tela (abas, como no design system); o JSON abre pelo rodapé e volta pelo "Voltar".
const MODES = [
  ["files", "Importar arquivos", Upload],
  ["manual", "Criar manualmente", Hand],
] as const;
const STEPS = ["Arquivos", "Revisão", "Baixar"];

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
  pasteText,
  setPasteText,
  busy,
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
  proposalTrigger,
  portableInput,
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
  const viewProps = json
    ? { "aria-labelledby": "entry-title" }
    : {
        id: `panel-${entry}`,
        role: "tabpanel",
        "aria-labelledby": `tab-${entry}`,
      };

  return (
    <main className="entry-panel surface-panel" data-entry={entry}>
      <div className="entry-top">
        <h1 id="entry-title" className="entry-title">
          {json ? "Importar JSON" : "Criar disciplina"}
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
          <div className="entry-modes" role="tablist" aria-label="Como começar">
            {MODES.map(([value, label, Icon], index) => (
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
                {label}
              </button>
            ))}
          </div>
        )}
        <ol className="entry-steps" aria-label="Etapas">
          {STEPS.map((step, index) => (
            <li key={step} aria-current={index === 0 ? "step" : undefined}>
              <span aria-hidden="true">{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>
      <section className="entry-view" {...viewProps}>
        {entry === "files" && (
          <ImportFilesPanel
            setSelectedFiles={setSelectedFiles}
            selectedFiles={selectedFiles}
            provider={provider}
            setProvider={setProvider}
            keys={keys}
            setKeys={setKeys}
            pasteText={pasteText}
            setPasteText={setPasteText}
            busy={busy}
            importDocuments={importDocuments}
            pasting={pasting}
            setPasting={setPasting}
          />
        )}
        {entry === "manual" && (
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
          <button
            type="button"
            className="entry-link"
            onClick={() => setShowPrompt(true)}
          >
            <Copy size={18} aria-hidden="true" />
            Copiar prompt
          </button>
        </div>
      )}
    </main>
  );
}
