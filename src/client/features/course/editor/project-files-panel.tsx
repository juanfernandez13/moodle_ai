"use client";
import { FileText, Upload, Trash2, Download, Paperclip } from "lucide-react";
import { PROJECT_FILE_LIMITS } from "../../../project.ts";
import type { CourseProject } from "../../../project.ts";
import { applyCommands } from "../../../commands.ts";
import { downloadFile, formatBytes } from "../../../download.ts";
import { formatMegabytes } from "../../../../shared/upload-limits.ts";
import { withDraft } from "../../../provenance.ts";
import { ProvenanceViewer } from "../../../components/provenance-viewer.tsx";
import type { CourseBuilderModel } from "../hooks/use-course-builder.ts";

type Props = Pick<
  CourseBuilderModel,
  "missingTarget"
  | "setMissingTarget"
  | "addFiles"
  | "allActivities"
  | "setProject"
  | "setValidatedRevision"
  | "lastCopy"
>
  & { project: CourseProject; };

// Anexos vão para o backup Moodle e seguem os limites dele.
const ATTACHMENT_LIMITS_TEXT = `Até ${formatMegabytes(PROJECT_FILE_LIMITS.attachmentBytes)} por arquivo · ${formatMegabytes(PROJECT_FILE_LIMITS.attachmentsTotalBytes)} no total`;

export function ProjectFilesPanel({
  project,
  missingTarget,
  setMissingTarget,
  addFiles,
  allActivities,
  setProject,
  setValidatedRevision,
  lastCopy,
}: Props) {
  return (
    <>
      <h2>Arquivos do projeto</h2>
      <p className="intro-help">
        Os arquivos ficam neste navegador e acompanham a cópia
        portátil. Associe-os às atividades ou aos blocos de imagem.
      </p>
      {project.draft.attachments.some(
        (entry) =>
          !project.assets.some((asset) => asset.id === entry.id),
      ) && (
          <label className="field">
            <span>Completar uma referência sem bytes</span>
            <select
              value={missingTarget}
              onChange={(event) => setMissingTarget(event.target.value)}
            >
              <option value="">Adicionar novo arquivo</option>
              {project.draft.attachments
                .filter(
                  (entry) =>
                    !project.assets.some(
                      (asset) => asset.id === entry.id,
                    ),
                )
                .map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
            </select>
          </label>
        )}
      <label className="file-button add-file">
        <Upload size={18} />
        {missingTarget
          ? "Fornecer arquivo desta referência"
          : "Adicionar arquivos"}
        <input
          className="visually-hidden"
          type="file"
          multiple={!missingTarget}
          aria-label="Adicionar arquivos ao projeto"
          onChange={(event) => {
            void addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </label>
      <p className="field-help">{ATTACHMENT_LIMITS_TEXT}</p>
      <ul className="file-list project-file-list">
        {project.assets.map((file) => (
          <li key={file.id}>
            <Paperclip size={19} />
            <span>
              {file.name}
              <small>
                {formatBytes(file.bytes.length)} ·{" "}
                {
                  allActivities.filter((entry) =>
                    entry.attachmentIds.includes(file.id),
                  ).length
                }{" "}
                vínculos diretos
              </small>
            </span>
            <button
              type="button"
              className="icon-button"
              aria-label={`Baixar ${file.name}`}
              onClick={() =>
                downloadFile(file.bytes, file.name, file.mediaType)
              }
            >
              <Download size={18} />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label={`Remover ${file.name}`}
              onClick={() => {
                if (
                  !confirm(
                    `Remover “${file.name}”? Vínculos ou imagens que dependem dele ficarão pendentes.`,
                  )
                )
                  return;
                const result = applyCommands(
                  project.draft,
                  project.draft.revision,
                  [
                    {
                      type: "set_attachments",
                      attachments: project.draft.attachments.filter(
                        (entry) => entry.id !== file.id,
                      ),
                    },
                  ],
                );
                if (result.ok) {
                  setProject({
                    ...withDraft(project, result.draft),
                    assets: project.assets.filter(
                      (entry) => entry.id !== file.id,
                    ),
                  });
                  setValidatedRevision(null);
                }
              }}
            >
              <Trash2 size={18} />
            </button>
          </li>
        ))}
      </ul>
      <h3>Documentos de origem</h3>
      {project.sources.length === 0 ? (
        <p className="field-help">
          Este curso foi criado sem documento de origem.
        </p>
      ) : (
        <ul className="file-list">
          {project.sources.map((file) => (
            <li key={file.id}>
              <FileText size={18} />
              <span>
                {file.name}
                <small>{formatBytes(file.bytes.length)}</small>
              </span>
              <button
                type="button"
                className="icon-button"
                aria-label={`Baixar fonte ${file.name}`}
                onClick={() =>
                  downloadFile(file.bytes, file.name, file.mediaType)
                }
              >
                <Download size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="notice">
        Última cópia portátil:{" "}
        {lastCopy === null
          ? "ainda não exportada nesta sessão"
          : `revisão ${lastCopy}`}
        . Salvar no navegador não substitui uma cópia em outro local.
      </div>
      <ProvenanceViewer project={project} />
    </>
  );
}
