"use client";
import type { Activity } from "../../../domain/course/index.ts";
import { utcFieldValue, utcTimestamp } from "../../dates.ts";

const dateValue = utcFieldValue;
const timestamp = utcTimestamp;
type Props = {
  activity: Activity;
  pane: string;
  onChange: (activity: Activity) => void
};

export function ActivitySettings({ activity, pane, onChange }: Props) {
  return (
    <>{activity.type === "forum" && pane === "settings" && (
      <label className="field">
        <span>Tipo de fórum</span>
        <select
          data-field="settings.discussionMode"
          value={activity.settings.discussionMode}
          onChange={(event) =>
            onChange({
              ...activity,
              settings: {
                discussionMode: event.target.value as "general" | "single",
              },
            })
          }
        >
          <option value="general">Discussão geral</option>
          <option value="single">Uma única discussão</option>
        </select>
      </label>
    )}
      {activity.type === "assignment" && pane === "settings" && (
        <div className="field-grid">
          <label className="field">
            <span>Nota máxima</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              data-field="settings.maxGrade"
              value={activity.settings.maxGrade}
              onChange={(event) =>
                onChange({
                  ...activity,
                  settings: {
                    ...activity.settings,
                    maxGrade: Number(event.target.value),
                  },
                })
              }
            />
          </label>
          <label className="field">
            <span>Forma de envio</span>
            <select
              data-field="settings.submissionMode"
              value={activity.settings.submissionMode}
              onChange={(event) =>
                onChange({
                  ...activity,
                  settings: {
                    ...activity.settings,
                    submissionMode: event.target.value as
                      | "file"
                      | "text"
                      | "both",
                  },
                })
              }
            >
              <option value="file">Arquivo</option>
              <option value="text">Texto</option>
              <option value="both">Arquivo e texto</option>
            </select>
          </label>
        </div>
      )}
      {activity.type === "chat" && pane === "settings" && (
        <>
          <label className="field">
            <span>Primeira sessão (UTC)</span>
            <input
              type="datetime-local"
              data-field="settings.sessionAt"
              value={dateValue(activity.settings.sessionAt)}
              onChange={(event) => {
                const settings = { ...activity.settings };
                const value = timestamp(event.target.value);
                if (value) settings.sessionAt = value;
                else delete settings.sessionAt;
                onChange({ ...activity, settings });
              }}
            />
          </label>
          <div className="field-grid">
            <label className="field">
              <span>Repetição</span>
              <select
                data-field="settings.repeat"
                value={activity.settings.repeat}
                onChange={(event) =>
                  onChange({
                    ...activity,
                    settings: {
                      ...activity.settings,
                      repeat: event.target.value as "none" | "daily" | "weekly",
                    },
                  })
                }
              >
                <option value="none">Sem repetição</option>
                <option value="daily">Diária</option>
                <option value="weekly">Semanal</option>
              </select>
            </label>
            <label className="field">
              <span>Guardar mensagens por dias (0 = sempre)</span>
              <input
                type="number"
                min="0"
                max="3650"
                data-field="settings.keepDays"
                value={activity.settings.keepDays}
                onChange={(event) =>
                  onChange({
                    ...activity,
                    settings: {
                      ...activity.settings,
                      keepDays: Number(event.target.value),
                    },
                  })
                }
              />
            </label>
          </div>
        </>
      )}
      {activity.type === "wiki" && pane === "settings" && (
        <div className="field-grid">
          <label className="field">
            <span>Modo da wiki</span>
            <select
              data-field="settings.mode"
              value={activity.settings.mode}
              onChange={(event) =>
                onChange({
                  ...activity,
                  settings: {
                    ...activity.settings,
                    mode: event.target.value as "collaborative" | "individual",
                  },
                })
              }
            >
              <option value="collaborative">Colaborativa</option>
              <option value="individual">Individual</option>
            </select>
          </label>
          <label className="field">
            <span>Título da primeira página</span>
            <input
              data-field="settings.firstPageTitle"
              value={activity.settings.firstPageTitle}
              onChange={(event) =>
                onChange({
                  ...activity,
                  settings: {
                    ...activity.settings,
                    firstPageTitle: event.target.value,
                  },
                })
              }
            />
          </label>
        </div>
      )}</>
  );
}
