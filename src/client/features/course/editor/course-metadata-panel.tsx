"use client";
import { RichEditor } from "../../../components/content.tsx";
import type { CourseProject } from "../../../project.ts";
import { richBlockFocus } from "../../../navigation.ts";
import { utcFieldValue, utcTimestamp } from "../../../dates.ts";
import type { CourseBuilderModel } from "../hooks/use-course-builder.ts";

type Props = Pick<
  CourseBuilderModel,
  "coursePane" | "setCoursePane" | "commands" | "issueFocus"
>
  & { project: CourseProject; };

export function CourseMetadataPanel({
  coursePane,
  setCoursePane,
  project,
  commands,
  issueFocus
}: Props) {
  return (
    <>
      <div className="section-heading">
        <div>
          <p className="subtle">Disciplina</p>
          <h2>Dados do curso</h2>
        </div>
      </div>
      <nav className="panel-tabs" aria-label="Dados do curso">
        {[
          ["discipline", "Disciplina"],
          ["organization", "Organização"],
          ["teacher", "Professor"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={coursePane === id}
            onClick={() => setCoursePane(id!)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div hidden={coursePane !== "discipline"}>
        <div className="field-grid">
          <label className="field">
            <span>Nome completo do curso</span>
            <input
              data-field="metadata.fullName"
              value={project.draft.metadata.fullName}
              onChange={(event) =>
                commands([
                  {
                    type: "set_metadata",
                    metadata: {
                      ...project.draft.metadata,
                      fullName: event.target.value,
                    },
                  },
                ])
              }
            />
          </label>
          <label className="field">
            <span>Nome curto</span>
            <input
              data-field="metadata.shortName"
              value={project.draft.metadata.shortName}
              onChange={(event) =>
                commands([
                  {
                    type: "set_metadata",
                    metadata: {
                      ...project.draft.metadata,
                      shortName: event.target.value,
                    },
                  },
                ])
              }
            />
          </label>
        </div>
        <label className="field">
          <span>Apresentação</span>
          <textarea
            data-field="metadata.summary"
            value={project.draft.metadata.summary}
            onChange={(event) =>
              commands([
                {
                  type: "set_metadata",
                  metadata: {
                    ...project.draft.metadata,
                    summary: event.target.value,
                  },
                },
              ])
            }
          />
        </label>
        <RichEditor
          key={`metadata-summary-${issueFocus?.request ?? 0}`}
          label="Apresentação"
          fallback={project.draft.metadata.summary}
          blocks={project.draft.metadata.summaryBlocks}
          focusBlock={richBlockFocus(
            issueFocus?.path,
            "metadata.summaryBlocks",
          )}
          focusPath={issueFocus?.path}
          assets={project.assets}
          onChange={(blocks) =>
            commands([
              {
                type: "set_metadata",
                metadata: {
                  ...project.draft.metadata,
                  summaryBlocks: blocks,
                },
              },
            ])
          }
        />
      </div>
      <div hidden={coursePane !== "organization"}>
        <div className="field-grid">
          <label className="field">
            <span>Organização</span>
            <select
              data-field="metadata.organization"
              value={project.draft.metadata.organization}
              onChange={(event) =>
                commands([
                  {
                    type: "set_metadata",
                    metadata: {
                      ...project.draft.metadata,
                      organization: event.target.value as
                        | "topics"
                        | "weeks",
                    },
                  },
                ])
              }
            >
              <option value="topics">Tópicos</option>
              <option value="weeks">Semanas</option>
            </select>
          </label>
          <label className="field">
            <span>Início do curso (UTC)</span>
            <input
              type="datetime-local"
              data-field="metadata.startDate"
              value={utcFieldValue(project.draft.metadata.startDate)}
              onChange={(event) => {
                const metadata = { ...project.draft.metadata };
                const timestamp = utcTimestamp(event.target.value);
                if (timestamp) metadata.startDate = timestamp;
                else delete metadata.startDate;
                commands([{ type: "set_metadata", metadata }]);
              }}
            />
          </label>
          <label className="field">
            <span>Carga horária (opcional)</span>
            <input
              type="number"
              min="1"
              data-field="metadata.workloadHours"
              value={project.draft.metadata.workloadHours ?? ""}
              onChange={(event) => {
                const metadata = { ...project.draft.metadata };
                if (event.target.value)
                  metadata.workloadHours = Number(event.target.value);
                else delete metadata.workloadHours;
                commands([{ type: "set_metadata", metadata }]);
              }}
            />
          </label>
          <label className="field">
            <span>Semestre (opcional)</span>
            <input
              data-field="metadata.semester"
              value={project.draft.metadata.semester ?? ""}
              onChange={(event) => {
                const metadata = { ...project.draft.metadata };
                if (event.target.value)
                  metadata.semester = event.target.value;
                else delete metadata.semester;
                commands([{ type: "set_metadata", metadata }]);
              }}
            />
          </label>
          <label className="field">
            <span>Turma (opcional)</span>
            <input
              data-field="metadata.className"
              value={project.draft.metadata.className ?? ""}
              onChange={(event) => {
                const metadata = { ...project.draft.metadata };
                if (event.target.value)
                  metadata.className = event.target.value;
                else delete metadata.className;
                commands([{ type: "set_metadata", metadata }]);
              }}
            />
          </label>
        </div>
      </div>
      <div hidden={coursePane !== "teacher"}>
        <h3>Professor ou tutor</h3>
        <div className="field-grid">
          {[
            ["name", "Nome"],
            ["email", "E-mail"],
            ["qualification", "Formação"],
          ].map(([key, label]) => (
            <label className="field" key={key}>
              <span>{label}</span>
              <input
                data-field={`metadata.teacher.${key}`}
                value={
                  project.draft.metadata.teacher?.[
                  key as "name" | "email" | "qualification"
                  ] ?? ""
                }
                onChange={(event) => {
                  const teacher = {
                    name: "",
                    ...project.draft.metadata.teacher,
                  };
                  if (event.target.value || key === "name")
                    teacher[
                      key as "name" | "email" | "qualification"
                    ] = event.target.value;
                  else
                    delete teacher[key as "email" | "qualification"];
                  const metadata = { ...project.draft.metadata };
                  if (
                    teacher.name ||
                    teacher.email ||
                    teacher.qualification
                  )
                    metadata.teacher = teacher;
                  else delete metadata.teacher;
                  commands([{ type: "set_metadata", metadata }]);
                }}
              />
            </label>
          ))}
        </div>
      </div>
      <div className="notice">
        As unidades e atividades ficam na estrutura ao lado. Nenhuma
        avaliação ou regra institucional é acrescentada
        automaticamente.
      </div>
    </>
  );
}
