"use client";
import { Plus, Trash2, ArrowUp, ArrowDown, ArrowLeft } from "lucide-react";
import { ActivityEditor } from "../../../components/activity-editor.tsx";
import { RichEditor } from "../../../components/content.tsx";
import { makeActivity, activityLabels } from "../../../project.ts";
import type { CourseProject } from "../../../project.ts";
import { Pagination } from "../../../components/pagination.tsx";
import { richBlockFocus } from "../../../navigation.ts";
import type { CourseBuilderModel } from "../hooks/use-course-builder.ts";

type Props = Pick<
  CourseBuilderModel,
  "activity"
  | "commands"
  | "setView"
  | "setActivityId"
  | "issueFocus"
  | "setActivityPages"
  | "visibleActivities"
  | "activityPage"
>
  & {
    project: CourseProject;
    section: NonNullable<CourseBuilderModel["section"]>;
  };

export function SectionPanel({
  project,
  section,
  activity,
  commands,
  setView,
  setActivityId,
  issueFocus,
  setActivityPages,
  visibleActivities,
  activityPage,
}: Props) {
  return (
    <>
      <div className="section-heading">
        <div>
          <p className="subtle">
            Unidade {project.draft.sections.indexOf(section) + 1}
          </p>
          <h2>{activity ? activity.title : section.title}</h2>
        </div>
        <div className="icon-actions">
          <button
            type="button"
            aria-label="Subir unidade"
            disabled={project.draft.sections.indexOf(section) === 0}
            onClick={() =>
              commands([
                {
                  type: "move_section",
                  sectionId: section.id,
                  to: project.draft.sections.indexOf(section) - 1,
                },
              ])
            }
          >
            <ArrowUp size={17} />
          </button>
          <button
            type="button"
            aria-label="Descer unidade"
            disabled={
              project.draft.sections.indexOf(section) ===
              project.draft.sections.length - 1
            }
            onClick={() =>
              commands([
                {
                  type: "move_section",
                  sectionId: section.id,
                  to: project.draft.sections.indexOf(section) + 1,
                },
              ])
            }
          >
            <ArrowDown size={17} />
          </button>
          <button
            type="button"
            aria-label="Remover unidade"
            disabled={project.draft.sections.length === 1}
            onClick={() => {
              if (
                confirm(
                  `Remover “${section.title}” e suas ${section.activities.length} atividades?`,
                )
              ) {
                commands([
                  { type: "remove_section", sectionId: section.id },
                ]);
                setView("course");
              }
            }}
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>
      {activity ? (
        <>
          <button
            type="button"
            className="text-button"
            onClick={() => setActivityId(null)}
          >
            <ArrowLeft size={16} />
            Todas as atividades da unidade
          </button>
          <ActivityEditor
            key={`${activity.id}-${issueFocus?.request ?? 0}`}
            activity={activity}
            assets={project.assets}
            focusPath={
              issueFocus?.activityId === activity.id
                ? issueFocus.path
                : undefined
            }
            onChange={(next) =>
              commands([
                {
                  type: "set_activity",
                  activityId: next.id,
                  activity: next,
                },
              ])
            }
          />
        </>
      ) : (
        <>
          <div className="add-activities">
            <h3>Adicionar atividade</h3>
            <div className="activity-choices">
              {Object.entries(activityLabels).map(([type, label]) => (
                <button
                  type="button"
                  key={type}
                  className="secondary"
                  onClick={() => {
                    const next = makeActivity(type);
                    commands([
                      {
                        type: "add_activity",
                        sectionId: section.id,
                        activity: next,
                      },
                    ]);
                    setActivityId(next.id);
                    setActivityPages((previous) => ({
                      ...previous,
                      [section.id]: Math.floor(
                        section.activities.length / 5,
                      ),
                    }));
                  }}
                >
                  <Plus size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <h3>Atividades</h3>
          {section.activities.length === 0 && (
            <p className="empty-state">
              Esta unidade está pronta para receber sua primeira
              atividade.
            </p>
          )}
          <div className="activity-list">
            {visibleActivities.map(({ entry, index }) => (
              <div className="activity-row" key={entry.id}>
                <button
                  type="button"
                  className="activity-open"
                  onClick={() => setActivityId(entry.id)}
                >
                  <span
                    className={`activity-type type-${entry.type}`}
                  >
                    {activityLabels[entry.type]}
                  </span>
                  <strong>{entry.title}</strong>
                  <small>
                    {entry.type === "quiz"
                      ? `${entry.questions.length} ${entry.questions.length === 1 ? "questão" : "questões"}`
                      : `${entry.attachmentIds.length} anexos`}
                  </small>
                </button>
                <span className="icon-actions">
                  <button
                    type="button"
                    aria-label={`Subir ${entry.title}`}
                    disabled={index === 0}
                    onClick={() => {
                      commands([
                        {
                          type: "move_activity",
                          activityId: entry.id,
                          to: index - 1,
                        },
                      ]);
                      setActivityPages((previous) => ({
                        ...previous,
                        [section.id]: Math.floor((index - 1) / 5),
                      }));
                    }}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Descer ${entry.title}`}
                    disabled={index === section.activities.length - 1}
                    onClick={() => {
                      commands([
                        {
                          type: "move_activity",
                          activityId: entry.id,
                          to: index + 1,
                        },
                      ]);
                      setActivityPages((previous) => ({
                        ...previous,
                        [section.id]: Math.floor((index + 1) / 5),
                      }));
                    }}
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remover ${entry.title}`}
                    onClick={() => {
                      if (confirm(`Remover “${entry.title}”?`))
                        commands([
                          {
                            type: "remove_activity",
                            activityId: entry.id,
                          },
                        ]);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </span>
              </div>
            ))}
          </div>
          {section.activities.length > 5 && (
            <Pagination
              page={activityPage}
              count={section.activities.length}
              size={5}
              onChange={(page) =>
                setActivityPages((previous) => ({
                  ...previous,
                  [section.id]: page,
                }))
              }
            />
          )}
          <h3>Título e resumo da unidade</h3>
          <label className="field">
            <span>Título da unidade</span>
            <input
              data-field="title"
              value={section.title}
              onChange={(event) =>
                commands([
                  {
                    type: "set_section",
                    sectionId: section.id,
                    title: event.target.value,
                    summary: section.summary,
                  },
                ])
              }
            />
          </label>
          <label className="field">
            <span>Resumo da unidade</span>
            <textarea
              data-field="summary"
              value={section.summary}
              onChange={(event) =>
                commands([
                  {
                    type: "set_section",
                    sectionId: section.id,
                    title: section.title,
                    summary: event.target.value,
                  },
                ])
              }
            />
          </label>
          <RichEditor
            key={`section-summary-${section.id}-${issueFocus?.request ?? 0}`}
            label="Resumo da unidade"
            fallback={section.summary}
            blocks={section.summaryBlocks}
            focusBlock={richBlockFocus(
              issueFocus?.path,
              `sections[${project.draft.sections.indexOf(section)}].summaryBlocks`,
            )}
            focusPath={issueFocus?.path}
            assets={project.assets}
            onChange={(blocks) =>
              commands([
                {
                  type: "set_section",
                  sectionId: section.id,
                  title: section.title,
                  summary: section.summary,
                  summaryBlocks: blocks,
                },
              ])
            }
          />
        </>
      )}
    </>
  );
}
