"use client";
import { useEffect, useRef } from "react";
import { Plus, FolderOpen, BookOpen, Paperclip } from "lucide-react";
import { makeQuizSection, makeSection } from "../../../project.ts";
import type { CourseProject } from "../../../project.ts";
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
  const nav = useRef<HTMLElement>(null);
  // Pacote só de quizzes: sem dados da disciplina nem notas, e cada seção é numerada pelo destino no Moodle.
  const quizOnly = project.draft.metadata.quizOnly === true;
  function addSection() {
    const sections = project.draft.sections;
    const next = quizOnly
      ? makeQuizSection(
          Math.max(0, ...sections.map((entry) => entry.targetNumber ?? 0)) + 1,
        )
      : makeSection(sections.length + 1);
    commands([{ type: "add_section", section: next }]);
    setView(next.id);
    setActivityId(null);
  }
  // O Sumário rola por dentro: o item escolhido (inclusive uma unidade recém-criada) sempre fica à vista.
  useEffect(() => {
    nav.current
      ?.querySelector<HTMLElement>("button.selected")
      ?.scrollIntoView({ block: "nearest" });
  }, [view, project.draft.sections.length]);
  return (
    <><div className="mobile-course-nav surface-panel">
      <label className="field">
        <span>Onde editar</span>
        <select
          value={view}
          onChange={(event) => {
            setView(event.target.value);
            setActivityId(null);
          }}
        >
          {!quizOnly && <option value="course">Dados da disciplina</option>}
          {project.draft.sections.map((entry, index) => (
            <option key={entry.id} value={entry.id}>
              {quizOnly ? entry.title : `${index + 1}. ${entry.title}`} (
              {activitySummary(entry.activities)})
            </option>
          ))}
          {!quizOnly && <option value="grades">Avaliação</option>}
          <option value="files">Arquivos do projeto</option>
        </select>
      </label>
      <div className="button-row">
        <button
          className="text-button"
          type="button"
          onClick={addSection}
        >
          <Plus size={16} aria-hidden="true" />
          {quizOnly ? "Seção" : "Unidade"}
        </button>
        <button
          className="text-button"
          type="button"
          onClick={() => setShowProjects(true)}
        >
          <FolderOpen size={16} aria-hidden="true" />
          Suas disciplinas
        </button>
      </div>
    </div>
      <nav
        ref={nav}
        className="course-nav surface-panel"
        aria-label={quizOnly ? "Seções dos quizzes" : "Estrutura da disciplina"}
      >
        <div className="nav-title">
          <BookOpen size={18} aria-hidden="true" />
          <strong>{quizOnly ? "Seus quizzes" : "Sua disciplina"}</strong>
        </div>
        {!quizOnly && (
          <button
            type="button"
            className={view === "course" ? "selected" : ""}
            aria-current={view === "course" ? "page" : undefined}
            onClick={() => {
              setView("course");
              setActivityId(null);
            }}
          >
            Dados da disciplina
          </button>
        )}
        {project.draft.sections.map((entry, index) => (
          <button
            key={entry.id}
            type="button"
            className={`section-nav ${view === entry.id ? "selected" : ""}`}
            aria-current={view === entry.id ? "page" : undefined}
            onClick={() => {
              setView(entry.id);
              setActivityId(null);
            }}
          >
            <span className="unit-number">
              {quizOnly ? (entry.targetNumber ?? index + 1) : index + 1}
            </span>
            <span>
              {entry.title}
              <small>{activitySummary(entry.activities)}</small>
            </span>
          </button>
        ))}
        <button
          type="button"
          className="nav-add"
          onClick={addSection}
        >
          <Plus size={17} aria-hidden="true" />
          {quizOnly ? "Adicionar seção" : "Adicionar unidade"}
        </button>
        <div className="nav-divider" />
        {!quizOnly && (
          <button
            type="button"
            className={view === "grades" ? "selected" : ""}
            aria-current={view === "grades" ? "page" : undefined}
            onClick={() => setView("grades")}
          >
            Avaliação
          </button>
        )}
        <button
          type="button"
          className={view === "files" ? "selected" : ""}
          aria-current={view === "files" ? "page" : undefined}
          onClick={() => setView("files")}
        >
          <Paperclip size={17} aria-hidden="true" />
          Arquivos ({project.assets.length})
        </button>
        <button type="button" onClick={() => setShowProjects(true)}>
          <FolderOpen size={17} aria-hidden="true" />
          Suas disciplinas
        </button>
      </nav></>
  );
}
