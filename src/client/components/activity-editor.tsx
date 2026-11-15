"use client";
import { useId, useState } from "react";
import type { Activity } from "../../domain/course/index.ts";
import type { ProjectFile } from "../project.ts";
import { RichEditor } from "./content.tsx";
import { PanelTabs, tabPanelProps } from "./panel-tabs.tsx";
import { richBlockFocus } from "../navigation.ts";
import { QuizEditor } from "./activity-editors/quiz-editor.tsx";
import { GlossaryEditor } from "./activity-editors/glossary-editor.tsx";
import { ActivitySettings } from "./activity-editors/activity-settings.tsx";
import { localFieldValue, localTimestamp } from "../dates.ts";
const dateValue = localFieldValue;
const timestamp = localTimestamp;

export function ActivityEditor({
  activity,
  assets,
  onChange,
  focusPath,
}: {
  activity: Activity;
  assets: ProjectFile[];
  onChange: (activity: Activity) => void;
  focusPath?: string | undefined;
}) {
  const tabs = useId();
  const [pane, setPane] = useState(
    focusPath?.includes(".questions[")
      ? "questions"
      : focusPath?.includes(".entries[")
        ? "entries"
        : focusPath?.includes(".attachmentIds")
          ? "attachments"
          : focusPath && /\.(settings|schedule)/.test(focusPath)
            ? "settings"
            : "content",
  );
  const [questionId, setQuestionId] = useState<string | null>(() =>
    activity.type === "quiz" && focusPath
      ? (activity.questions[
        Number(focusPath.match(/\.questions\[(\d+)\]/)?.[1])
      ]?.id ?? null)
      : null,
  );
  const [entryId, setEntryId] = useState<string | null>(() =>
    activity.type === "glossary" && focusPath
      ? (activity.entries[Number(focusPath.match(/\.entries\[(\d+)\]/)?.[1])]
        ?.id ?? null)
      : null,
  );
  const selectedQuestion =
    activity.type === "quiz"
      ? (activity.questions.find((entry) => entry.id === questionId) ??
        activity.questions[0])
      : undefined;
  const selectedEntry =
    activity.type === "glossary"
      ? (activity.entries.find((entry) => entry.id === entryId) ??
        activity.entries[0])
      : undefined;
  const setSchedule = (field: "opensAt" | "closesAt", value: string) => {
    const schedule = { ...activity.schedule };
    const converted = timestamp(value);
    if (converted) schedule[field] = converted;
    else delete schedule[field];
    const next = { ...activity };
    if (Object.keys(schedule).length) next.schedule = schedule;
    else delete next.schedule;
    onChange(next);
  };
  return (
    <div className="activity-fields" id={`entity-${activity.id}`}>
      <PanelTabs
        base={tabs}
        label="Edição da atividade"
        tabs={[
          { id: "content", label: "Conteúdo" },
          { id: "settings", label: "Configuração e datas" },
          ...(activity.type === "quiz"
            ? [{ id: "questions", label: "Questões" }]
            : []),
          ...(activity.type === "glossary"
            ? [{ id: "entries", label: "Conceitos" }]
            : []),
          { id: "attachments", label: "Anexos" },
        ]}
        value={pane}
        onChange={setPane}
      />
      <label className="field">
        <span>Título da atividade</span>
        <input
          data-field="title"
          value={activity.title}
          onChange={(event) =>
            onChange({ ...activity, title: event.target.value })
          }
        />
      </label>
      <div {...tabPanelProps(tabs, "content", pane)}>
        <label className="field">
          <span>Descrição da atividade</span>
          <textarea
            data-field="description"
            value={activity.description}
            onChange={(event) =>
              onChange({ ...activity, description: event.target.value })
            }
          />
        </label>
        <RichEditor
          label="Descrição"
          fallback={activity.description}
          blocks={activity.descriptionBlocks}
          focusBlock={richBlockFocus(
            focusPath,
            `${focusPath?.match(/^(.*\.activities\[\d+\])/)?.[1] ?? ""}.descriptionBlocks`,
          )}
          focusPath={focusPath}
          assets={assets}
          onChange={(blocks) =>
            onChange({ ...activity, descriptionBlocks: blocks })
          }
        />
      </div>
      <div {...tabPanelProps(tabs, "settings", pane)}>
        <div className="field-grid">
          <label className="field">
            <span>Abertura</span>
            <input
              type="datetime-local"
              data-field="schedule.opensAt"
              value={dateValue(activity.schedule?.opensAt)}
              onChange={(event) => setSchedule("opensAt", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Fechamento</span>
            <input
              type="datetime-local"
              data-field="schedule.closesAt"
              value={dateValue(activity.schedule?.closesAt)}
              onChange={(event) => setSchedule("closesAt", event.target.value)}
            />
          </label>
        </div>
        <ActivitySettings activity={activity} onChange={onChange} />
        {activity.type === "quiz" && (
          <QuizEditor
            part="settings"
            activity={activity}
            assets={assets}
            onChange={onChange}
            focusPath={focusPath}
            selectedQuestion={selectedQuestion}
            setQuestionId={setQuestionId}
          />
        )}
        {activity.type === "glossary" && (
          <GlossaryEditor
            part="settings"
            activity={activity}
            assets={assets}
            onChange={onChange}
            focusPath={focusPath}
            selectedEntry={selectedEntry}
            setEntryId={setEntryId}
          />
        )}
      </div>
      {activity.type === "quiz" && (
        <div {...tabPanelProps(tabs, "questions", pane)}>
          <QuizEditor
            part="questions"
            activity={activity}
            assets={assets}
            onChange={onChange}
            focusPath={focusPath}
            selectedQuestion={selectedQuestion}
            setQuestionId={setQuestionId}
          />
        </div>
      )}
      {activity.type === "glossary" && (
        <div {...tabPanelProps(tabs, "entries", pane)}>
          <GlossaryEditor
            part="entries"
            activity={activity}
            assets={assets}
            onChange={onChange}
            focusPath={focusPath}
            selectedEntry={selectedEntry}
            setEntryId={setEntryId}
          />
        </div>
      )}
      <div {...tabPanelProps(tabs, "attachments", pane)}>
        <fieldset className="attachment-selector">
          <legend>Anexos desta atividade</legend>
          {assets.length === 0 ? (
            <p className="field-help">
              Adicione arquivos na aba Arquivos do projeto.
            </p>
          ) : (
            assets.map((file) => (
              <label className="check-row" key={file.id}>
                <input
                  type="checkbox"
                  data-field={`attachmentIds.${file.id}`}
                  checked={activity.attachmentIds.includes(file.id)}
                  onChange={(event) =>
                    onChange({
                      ...activity,
                      attachmentIds: event.target.checked
                        ? [...activity.attachmentIds, file.id]
                        : activity.attachmentIds.filter((id) => id !== file.id),
                    })
                  }
                />
                <span>{file.name}</span>
              </label>
            ))
          )}
        </fieldset>
      </div>
    </div>
  );
}
