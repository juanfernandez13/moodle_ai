"use client";
import type { Question } from "../../../domain/course/index.ts";
import type { ProjectFile } from "../../project.ts";
import { newId } from "../../project.ts";
import { RichEditor } from "../content.tsx";
import { richBlockFocus } from "../../navigation.ts";
import { Plus } from "lucide-react";
import { OrderControls } from "./order-controls.tsx";
import { reorder } from "./editor-helpers.ts";
type Props = {
  question: Extract<Question, { type: "multiple-choice" }>;
  onChange: (question: Question) => void;
  assets: ProjectFile[];
  focusPath?: string | undefined;
  questionPath: string
};

export function MultipleChoiceAnswers({ question, onChange, assets, focusPath, questionPath }: Props) {
  return (
    <div className="options-list">
      {question.options.map((option, optionIndex) => (
        <div
          className="question-option"
          key={option.id}
          id={`entity-${option.id}`}
        >
          <OrderControls
            label={`alternativa ${optionIndex + 1}`}
            index={optionIndex}
            count={question.options.length}
            move={(destination) =>
              onChange({
                ...question,
                options: reorder(
                  question.options,
                  optionIndex,
                  destination,
                ),
              })
            }
          />
          <label className="check-row">
            <input
              type="radio"
              name={`correct-${question.id}`}
              data-field="fraction"
              checked={option.fraction === 1}
              onChange={() =>
                onChange({
                  ...question,
                  options: question.options.map((entry) => ({
                    ...entry,
                    fraction: entry.id === option.id ? 1 : 0,
                  })),
                })
              }
            />
            <span>Alternativa {optionIndex + 1}: correta</span>
          </label>
          <label className="field">
            <span>Texto da alternativa {optionIndex + 1}</span>
            <textarea
              data-field="text"
              value={option.text}
              onChange={(event) =>
                onChange({
                  ...question,
                  options: question.options.map((entry) =>
                    entry.id === option.id
                      ? { ...entry, text: event.target.value }
                      : entry,
                  ),
                })
              }
            />
          </label>
          <RichEditor
            label={`Alternativa ${optionIndex + 1}`}
            fallback={option.text}
            blocks={option.textBlocks}
            focusBlock={richBlockFocus(
              focusPath,
              `${questionPath}.options[${optionIndex}].textBlocks`,
            )}
            focusPath={focusPath}
            assets={assets}
            onChange={(blocks) =>
              onChange({
                ...question,
                options: question.options.map((entry) =>
                  entry.id === option.id
                    ? { ...entry, textBlocks: blocks }
                    : entry,
                ),
              })
            }
          />
          <label className="field">
            <span>Feedback da alternativa</span>
            <input
              data-field="feedback"
              value={option.feedback}
              onChange={(event) =>
                onChange({
                  ...question,
                  options: question.options.map((entry) =>
                    entry.id === option.id
                      ? { ...entry, feedback: event.target.value }
                      : entry,
                  ),
                })
              }
            />
          </label>
          <RichEditor
            label="Feedback da alternativa"
            fallback={option.feedback}
            blocks={option.feedbackBlocks}
            focusBlock={richBlockFocus(
              focusPath,
              `${questionPath}.options[${optionIndex}].feedbackBlocks`,
            )}
            focusPath={focusPath}
            assets={assets}
            onChange={(blocks) =>
              onChange({
                ...question,
                options: question.options.map((entry) =>
                  entry.id === option.id
                    ? { ...entry, feedbackBlocks: blocks }
                    : entry,
                ),
              })
            }
          />
          <button
            type="button"
            className="text-button danger"
            disabled={question.options.length <= 2}
            onClick={() =>
              onChange({
                ...question,
                options: question.options.filter(
                  (entry) => entry.id !== option.id,
                ),
              })
            }
          >
            Remover alternativa {optionIndex + 1}
          </button>
        </div>
      ))}
      <button
        type="button"
        className="secondary"
        disabled={question.options.length >= 20}
        onClick={() =>
          onChange({
            ...question,
            options: [
              ...question.options,
              {
                id: newId("option"),
                text: "Nova alternativa",
                fraction: 0,
                feedback: "",
              },
            ],
          })
        }
      >
        <Plus size={16} />
        Alternativa
      </button>
    </div>
  );
}
