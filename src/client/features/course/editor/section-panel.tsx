"use client";
import { useEffect, useId, useState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, ArrowLeft } from "lucide-react";
import { ActivityEditor } from "../../../components/activity-editor.tsx";
import { RichEditor } from "../../../components/content.tsx";
import {
  makeActivity,
  activityLabels,
  quizSectionTitle,
} from "../../../project.ts";
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

/**
 * Só quizzes: o número da seção do Moodle que recebe estes quizzes (0 é a geral). O texto fica à parte do número
 * válido para dar para apagar o campo e digitar de novo; só um número inteiro de 0 a 200 chega à disciplina.
 */
function TargetNumberField({
  section,
  commands,
}: Pick<Props, "commands"> & { section: Props["section"] }) {
  const [text, setText] = useState(String(section.targetNumber ?? ""));
  useEffect(() => {
    setText(String(section.targetNumber ?? ""));
  }, [section.id, section.targetNumber]);
  const parsed = /^\d{1,3}$/.test(text.trim()) ? Number(text) : NaN;
  const valid = Number.isInteger(parsed) && parsed >= 0 && parsed <= 200;
  return (
    <label className="field">
      <span>Seção no Moodle (0 é a geral)</span>
      <input
        data-field="targetNumber"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={text}
        aria-invalid={valid ? undefined : true}
        onChange={(event) => {
          setText(event.target.value);
          const next = /^\d{1,3}$/.test(event.target.value.trim())
            ? Number(event.target.value)
            : NaN;
          if (Number.isInteger(next) && next >= 0 && next <= 200)
            commands([
              {
                type: "set_section",
                sectionId: section.id,
                title: quizSectionTitle(next),
                summary: section.summary,
                targetNumber: next,
              },
            ]);
        }}
      />
      {!valid && <small className="field-help">Use um número de 0 a 200.</small>}
    </label>
  );
}

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
  const choicesId = useId();
  // Só quizzes: a seção é o destino no Moodle; só há quiz para adicionar e a ordem das seções não conta.
  const quizOnly = project.draft.metadata.quizOnly === true;
  // Os seis tipos de atividade ficam recolhidos até a pessoa pedir; numa unidade vazia eles já vêm abertos.
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const empty = section.activities.length === 0;
  const adding = empty || addingFor === section.id;
  return (
    <>
      <div className="section-heading">
        <div>
          <p className="subtle">
            {quizOnly
              ? "Seção do Moodle"
              : `Unidade ${project.draft.sections.indexOf(section) + 1}`}
          </p>
          <h2>{activity ? activity.title : section.title}</h2>
        </div>
        {/* Com uma atividade aberta o título é o dela: subir, descer e a lixeira da UNIDADE ao lado dele pareciam agir
            sobre a atividade. Eles ficam só na tela da unidade. */}
        <div className="icon-actions" hidden={Boolean(activity)}>
          {!quizOnly && (
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
          )}
          {!quizOnly && (
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
          )}
          <button
            type="button"
            aria-label={quizOnly ? "Remover seção" : "Remover unidade"}
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
            {quizOnly
              ? "Todos os quizzes da seção"
              : "Todas as atividades da unidade"}
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
          {quizOnly && (
            <TargetNumberField section={section} commands={commands} />
          )}
          <div className="activities-head">
            <h3>{quizOnly ? "Quizzes" : "Atividades"}</h3>
            {!empty && (
              <button
                type="button"
                className="secondary"
                aria-expanded={adding}
                aria-controls={choicesId}
                onClick={() => setAddingFor(adding ? null : section.id)}
              >
                <Plus size={16} aria-hidden="true" />
                {quizOnly ? "Adicionar quiz" : "Adicionar atividade"}
              </button>
            )}
          </div>
          <div className="add-activities" id={choicesId} hidden={!adding}>
            <div
              className="activity-choices"
              role="group"
              aria-label="Tipo da atividade"
            >
              {Object.entries(activityLabels)
                .filter(([type]) => !quizOnly || type === "quiz")
                .map(([type, label]) => (
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
                    setAddingFor(null);
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
          {empty && (
            <p className="empty-state">
              {quizOnly
                ? "Esta seção ainda não tem quiz."
                : "Esta unidade está pronta para receber sua primeira atividade."}
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
                  {/* "0 anexos" em toda linha era só ruído: a contagem aparece quando há o que contar. */}
                  {(entry.type === "quiz" || entry.attachmentIds.length > 0) && (
                    <small>
                      {entry.type === "quiz"
                        ? `${entry.questions.length} ${entry.questions.length === 1 ? "questão" : "questões"}`
                        : entry.attachmentIds.length === 1
                          ? "1 anexo"
                          : `${entry.attachmentIds.length} anexos`}
                    </small>
                  )}
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
          {!quizOnly && (
            <>
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
      )}
    </>
  );
}
