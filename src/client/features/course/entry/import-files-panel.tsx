"use client";
import { FileText, Upload, Trash2, ClipboardList, ListChecks } from "lucide-react";
import { formatBytes } from "../../../download.ts";
import type { CourseBuilderModel } from "../hooks/use-course-builder.ts";

type Props = Pick<
  CourseBuilderModel,
  "setSelectedFiles"
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
>;

export function ImportFilesPanel({
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
}: Props) {
  return (
    <>
      <div className="uploads">
        {[
          [
            "planning",
            "Documento de planejamento",
            "Obrigatório",
            "DOCX, PDF com texto ou TXT",
            "Escolher documento",
          ],
          [
            "tasks",
            "Tarefas",
            "Opcional",
            "Documentos DOCX, PDF ou TXT de tarefas",
            "Adicionar tarefas",
          ],
          [
            "quizzes",
            "Quizzes",
            "Opcional",
            "Documentos DOCX, PDF ou TXT com questões",
            "Adicionar quizzes",
          ],
        ].map(([group, label, requirement, help, action]) => (
          <div
            className={`upload-group ${group === "planning" ? "planning-group" : ""}`}
            id={`upload-group-${group}`}
            key={group}
          >
            <div className="upload-row">
              {group === "planning" ? (
                <FileText size={24} aria-hidden="true" />
              ) : group === "tasks" ? (
                <ClipboardList size={24} aria-hidden="true" />
              ) : (
                <ListChecks size={24} aria-hidden="true" />
              )}
              <div className="upload-copy">
                <label htmlFor={`upload-${group}`}>
                  {label}
                  <small>{requirement}</small>
                </label>
                <p>{help}</p>
              </div>
              <label
                className="file-button"
                htmlFor={`upload-${group}`}
              >
                {action}
                <input
                  id={`upload-${group}`}
                  className="visually-hidden"
                  type="file"
                  multiple={group !== "planning"}
                  accept={".docx,.pdf,.txt"}
                  onChange={(event) => {
                    const files = Array.from(
                      event.target.files ?? [],
                    );
                    setSelectedFiles((previous) => ({
                      ...previous,
                      [group!]:
                        group === "planning"
                          ? files.slice(0, 1)
                          : [
                            ...previous[
                            group as keyof typeof previous
                            ],
                            ...files,
                          ],
                    }));
                    event.target.value = "";
                  }}
                />
              </label>
            </div>
            {selectedFiles[group as keyof typeof selectedFiles]
              .length > 0 && (
                <ul className="file-list">
                  {selectedFiles[
                    group as keyof typeof selectedFiles
                  ].map((file, index) => (
                    <li key={`${file.name}-${index}`}>
                      <FileText size={17} />
                      <span>
                        {file.name}
                        <small>{formatBytes(file.size)}</small>
                      </span>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Remover ${file.name}`}
                        onClick={() =>
                          setSelectedFiles((previous) => ({
                            ...previous,
                            [group!]: previous[
                              group as keyof typeof previous
                            ].filter(
                              (_, position) => position !== index,
                            ),
                          }))
                        }
                      >
                        <Trash2 size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
          </div>
        ))}
      </div>
      <details className="interpret-settings">
        <summary>
          Organização:{" "}
          {profile === "docx-topicos-v1" ? "tópicos" : "semanas"} ·{" "}
          {provider === "offline"
            ? "Perfil local, sem IA"
            : provider === "openai"
              ? "OpenAI"
              : "Gemini"}
        </summary>
        <div className="field-grid">
          <label className="field">
            <span>Organização do documento</span>
            <select
              value={profile}
              onChange={(event) =>
                setProfile(event.target.value as typeof profile)
              }
            >
              <option value="docx-topicos-v1">Por tópicos</option>
              <option value="docx-semanal-v1">Por semanas</option>
            </select>
          </label>
          <label className="field">
            <span>Interpretar com</span>
            <select
              value={provider}
              onChange={(event) =>
                setProvider(event.target.value as typeof provider)
              }
            >
              <option value="offline">Perfil local, sem IA</option>
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
            </select>
          </label>
        </div>
        <p className="field-help">
          O perfil local aceita planejamentos delimitados e informa o
          que não reconhece. Nada é enviado a uma IA nesse modo.
        </p>
        {provider !== "offline" && (
          <>
            <label className="field">
              <span>Chave do provedor (somente nesta sessão)</span>
              <input
                type="password"
                autoComplete="off"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Modelo</span>
              <input
                value={model}
                onChange={(event) => setModel(event.target.value)}
                placeholder={
                  provider === "openai"
                    ? "Modelo configurado pelo servidor"
                    : "Modelo configurado pelo servidor"
                }
              />
            </label>
            <p className="field-help">
              O documento será enviado ao provedor escolhido. A chave
              não será salva no projeto.
            </p>
          </>
        )}
        <label className="field">
          <span>Ou cole um planejamento em texto</span>
          <textarea
            value={pasteText}
            onChange={(event) => setPasteText(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="secondary"
          disabled={busy !== null}
          onClick={(event) => {
            void importDocuments(true, event.currentTarget);
          }}
        >
          Interpretar texto
        </button>
      </details>
      <button
        type="button"
        className="primary entry-primary"
        disabled={busy !== null}
        onClick={(event) => {
          void importDocuments(false, event.currentTarget);
        }}
      >
        <Upload size={18} />
        Interpretar planejamento
      </button>
      <p className="field-help centered import-limits">
        Até 10 MiB por arquivo, 20 MiB e 10 arquivos no total. Confira
        a proposta antes de abrir o editor.
      </p>
    </>
  );
}
