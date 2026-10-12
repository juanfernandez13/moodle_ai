"use client";
import { Plus, FolderOpen, Code2, BookOpen, Paperclip } from "lucide-react";
import { makeSection } from "../../../project.ts";
import type { CourseProject } from "../../../project.ts";
import { downloadFile } from "../../../download.ts";
import type { CourseBuilderModel } from "../hooks/use-course-builder.ts";
import { activitySummary } from "../helpers.ts";

type Props = Pick<
  CourseBuilderModel,
  "view" | "setView" | "setActivityId" | "commands" | "setShowProjects"
>
  & { project: CourseProject; };

export function CourseNavigation({
  view,
  setView,
  setActivityId,
  project,
  commands,
  setShowProjects
}: Props) {
  return (
    <><div className="mobile-course-nav glass">
      <label className="field">
        <span>Onde editar</span>
        <select
          value={view}
          onChange={(event) => {
            setView(event.target.value);
            setActivityId(null);
          }}
        >
          <option value="course">Dados da disciplina</option>
          {project.draft.sections.map((entry, index) => (
            <option key={entry.id} value={entry.id}>
              {index + 1}. {entry.title} ({activitySummary(entry.activities)})
            </option>
          ))}
          <option value="grades">Avaliação e presets</option>
          <option value="files">Arquivos do projeto</option>
        </select>
      </label>
      <div className="button-row">
        <button
          className="text-button"
          type="button"
          onClick={() => {
            const next = makeSection(project.draft.sections.length + 1);
            commands([{ type: "add_section", section: next }]);
            setView(next.id);
            setActivityId(null);
          }}
        >
          <Plus size={16} />
          Unidade
        </button>
        <button
          className="text-button"
          type="button"
          onClick={() => setShowProjects(true)}
        >
          <FolderOpen size={16} />
          Projetos
        </button>
        <button
          className="text-button"
          type="button"
          onClick={() =>
            downloadFile(
              new TextEncoder().encode(
                JSON.stringify(project.draft, null, 2),
              ),
              `${project.draft.metadata.shortName}.json`,
              "application/json",
            )
          }
        >
          <Code2 size={16} />
          JSON
        </button>
      </div>
    </div>
      <aside className="course-nav glass" aria-label="Estrutura do curso">
        <div className="nav-title">
          <BookOpen size={18} />
          <strong>Seu curso</strong>
        </div>
        <button
          type="button"
          className={view === "course" ? "selected" : ""}
          onClick={() => {
            setView("course");
            setActivityId(null);
          }}
        >
          Dados da disciplina
        </button>
        {project.draft.sections.map((entry, index) => (
          <button
            key={entry.id}
            type="button"
            className={`section-nav ${view === entry.id ? "selected" : ""}`}
            onClick={() => {
              setView(entry.id);
              setActivityId(null);
            }}
          >
            <span className="unit-number">{index + 1}</span>
            <span>
              {entry.title}
              <small>{activitySummary(entry.activities)}</small>
            </span>
          </button>
        ))}
        <button
          type="button"
          className="nav-add"
          onClick={() => {
            const next = makeSection(project.draft.sections.length + 1);
            commands([{ type: "add_section", section: next }]);
            setView(next.id);
            setActivityId(null);
          }}
        >
          <Plus size={17} />
          Adicionar unidade
        </button>
        <div className="nav-divider" />
        <button
          type="button"
          className={view === "grades" ? "selected" : ""}
          onClick={() => setView("grades")}
        >
          Avaliação e presets
        </button>
        <button
          type="button"
          className={view === "files" ? "selected" : ""}
          onClick={() => setView("files")}
        >
          <Paperclip size={17} />
          Arquivos ({project.assets.length})
        </button>
        <button type="button" onClick={() => setShowProjects(true)}>
          <FolderOpen size={17} />
          Projetos salvos
        </button>
        <button
          type="button"
          onClick={() =>
            downloadFile(
              new TextEncoder().encode(
                JSON.stringify(project.draft, null, 2),
              ),
              `${project.draft.metadata.shortName}.json`,
              "application/json",
            )
          }
        >
          <Code2 size={17} />
          Exportar JSON
        </button>
      </aside></>
  );
}
