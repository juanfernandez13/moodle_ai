"use client";
import { Save, FolderOpen, Copy, BookOpen } from "lucide-react";
import { EntryMascot } from "../../../components/entry-mascot.tsx";
import type { CourseBuilderModel } from "../hooks/use-course-builder.ts";
import { ImportFilesPanel } from "./import-files-panel.tsx";
import { ManualCourseForm } from "./manual-course-form.tsx";
import { JsonImportPanel } from "./json-import-panel.tsx";

type Props = Pick<
  CourseBuilderModel,
  "entry"
  | "setEntry"
  | "setError"
  | "setSelectedFiles"
  | "selectedFiles"
  | "profile"
  | "provider"
  | "setProfile"
  | "setProvider"
  | "apiKey"
  | "setApiKey"
  | "model"
  | "setModel"
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
  | "projects"
  | "setShowProjects"
>;

export function EntryPanel({
  entry,
  setEntry,
  setError,
  setSelectedFiles,
  selectedFiles,
  profile,
  provider,
  setProfile,
  setProvider,
  apiKey,
  setApiKey,
  model,
  setModel,
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
  projects,
  setShowProjects,
}: Props) {
  return (
    <main className="entry-panel glass">
      <ol className="journey" aria-label="Etapas de criação">
        <li aria-current="step">
          <span>1</span>Documentos
        </li>
        <li>
          <span>2</span>Revisão
        </li>
        <li>
          <span>3</span>Baixar curso
        </li>
      </ol>
      <div className="entry-tabs" role="tablist" aria-label="Como começar">
        {[
          ["files", "Importar arquivos"],
          ["manual", "Criar manualmente"],
          ["json", "Importar JSON"],
        ].map(([value, label], index) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={entry === value}
            aria-controls={`panel-${value}`}
            id={`tab-${value}`}
            tabIndex={entry === value ? 0 : -1}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                const modes = ["files", "manual", "json"] as const;
                const next =
                  (index + (event.key === "ArrowRight" ? 1 : 2)) % 3;
                setEntry(modes[next]!);
                document.getElementById(`tab-${modes[next]}`)?.focus();
              }
            }}
            onClick={() => {
              setEntry(value as typeof entry);
              setError("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <section
        id={`panel-${entry}`}
        role="tabpanel"
        aria-labelledby={`tab-${entry}`}
        className="entry-content"
      >
        <div className="panel-heading">
          <div>
            <h1>
              {entry === "files"
                ? "Arquivos do curso"
                : entry === "manual"
                  ? "Comece sua disciplina"
                  : "Importar JSON"}
            </h1>
            <p>
              {entry === "files"
                ? "Adicione o planejamento e os materiais."
                : entry === "manual"
                  ? "Dê um nome ao curso. As unidades e atividades vêm depois."
                  : "Traga um curso versionado ou a resposta de outra IA."}
            </p>
          </div>
          <EntryMascot />
        </div>
        {entry === "files" && (
          <ImportFilesPanel
            setSelectedFiles={setSelectedFiles}
            selectedFiles={selectedFiles}
            profile={profile}
            provider={provider}
            setProfile={setProfile}
            setProvider={setProvider}
            apiKey={apiKey}
            setApiKey={setApiKey}
            model={model}
            setModel={setModel}
            pasteText={pasteText}
            setPasteText={setPasteText}
            busy={busy}
            importDocuments={importDocuments}
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
        {entry === "json" && (
          <JsonImportPanel jsonText={jsonText} setJsonText={setJsonText} importJson={importJson} />
        )}
      </section>
      <div className="entry-secondary">
        <button type="button" className="text-button" onClick={example}>
          <BookOpen size={17} />
          Usar exemplo
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() => setShowPrompt(true)}
        >
          <Copy size={17} />
          Copiar prompt
        </button>
        <button
          type="button"
          className="text-button"
          onClick={(event) => {
            proposalTrigger.current = event.currentTarget;
            portableInput.current?.click();
          }}
        >
          <FolderOpen size={17} />
          Importar projeto
        </button>
        {projects.length > 0 && (
          <button
            type="button"
            className="text-button"
            onClick={() => setShowProjects(true)}
          >
            <Save size={17} />
            Projetos salvos ({projects.length})
          </button>
        )}
      </div>
    </main>
  );
}
