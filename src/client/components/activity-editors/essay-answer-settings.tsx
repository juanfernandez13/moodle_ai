"use client";
import type { Question } from "../../../domain/course/index.ts";

type Props = {
  question: Extract<Question, { type: "essay" }>;
  onChange: (question: Question) => void
};

export function EssayAnswerSettings({ question, onChange }: Props) {
  return (
    <>
      <div className="field-grid">
        <label className="field">
          <span>Formato da resposta</span>
          <select
            data-field="settings.responseFormat"
            value={question.settings.responseFormat}
            onChange={(event) =>
              onChange({
                ...question,
                settings: {
                  ...question.settings,
                  responseFormat: event.target.value as "editor" | "plain",
                },
              })
            }
          >
            <option value="editor">Editor de texto</option>
            <option value="plain">Texto simples</option>
          </select>
        </label>
        <label className="field">
          <span>Linhas da resposta</span>
          <input
            type="number"
            min="5"
            max="50"
            data-field="settings.responseLines"
            value={question.settings.responseLines}
            onChange={(event) =>
              onChange({
                ...question,
                settings: {
                  ...question.settings,
                  responseLines: Number(event.target.value),
                },
              })
            }
          />
        </label>
        <label className="field">
          <span>Anexos permitidos</span>
          <input
            type="number"
            min="0"
            max="10"
            data-field="settings.attachments"
            value={question.settings.attachments}
            onChange={(event) =>
              onChange({
                ...question,
                settings: {
                  ...question.settings,
                  attachments: Number(event.target.value),
                },
              })
            }
          />
        </label>
      </div>
      <label className="check-row">
        <input
          type="checkbox"
          data-field="settings.responseRequired"
          checked={question.settings.responseRequired}
          onChange={(event) =>
            onChange({
              ...question,
              settings: {
                ...question.settings,
                responseRequired: event.target.checked,
              },
            })
          }
        />
        Resposta obrigatória
      </label>
    </>
  );
}
