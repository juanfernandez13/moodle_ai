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
  question: Extract<Question, { type: "matching" }>;
  onChange: (question: Question) => void;
  assets: ProjectFile[];
  focusPath?: string | undefined;
  questionPath: string
};

export function MatchingAnswers({ question, onChange, assets, focusPath, questionPath }: Props) {
  return (
    <>
      {question.pairs.map((pair, pairIndex) => (
        <div
          className="question-option"
          key={pair.id}
          id={`entity-${pair.id}`}
        >
          <OrderControls
            label={`par ${pairIndex + 1}`}
            index={pairIndex}
            count={question.pairs.length}
            move={(destination) =>
              onChange({
                ...question,
                pairs: reorder(question.pairs, pairIndex, destination),
              })
            }
          />
          <div className="field-grid">
            <label className="field">
              <span>Afirmação {pairIndex + 1}</span>
              <textarea
                data-field="statement"
                value={pair.statement}
                onChange={(event) =>
                  onChange({
                    ...question,
                    pairs: question.pairs.map((entry) =>
                      entry.id === pair.id
                        ? { ...entry, statement: event.target.value }
                        : entry,
                    ),
                  })
                }
              />
            </label>
            <label className="field">
              <span>Resposta correspondente</span>
              <input
                data-field="answer"
                value={pair.answer}
                onChange={(event) =>
                  onChange({
                    ...question,
                    pairs: question.pairs.map((entry) =>
                      entry.id === pair.id
                        ? { ...entry, answer: event.target.value }
                        : entry,
                    ),
                  })
                }
              />
            </label>
          </div>
          <RichEditor
            label="Afirmação"
            fallback={pair.statement}
            blocks={pair.statementBlocks}
            focusBlock={richBlockFocus(
              focusPath,
              `${questionPath}.pairs[${pairIndex}].statementBlocks`,
            )}
            focusPath={focusPath}
            assets={assets}
            onChange={(blocks) =>
              onChange({
                ...question,
                pairs: question.pairs.map((entry) =>
                  entry.id === pair.id
                    ? { ...entry, statementBlocks: blocks }
                    : entry,
                ),
              })
            }
          />
          <button
            type="button"
            className="text-button danger"
            disabled={question.pairs.length <= 2}
            onClick={() =>
              onChange({
                ...question,
                pairs: question.pairs.filter(
                  (entry) => entry.id !== pair.id,
                ),
              })
            }
          >
            Remover par
          </button>
        </div>
      ))}
      <button
        type="button"
        className="secondary"
        onClick={() =>
          onChange({
            ...question,
            pairs: [
              ...question.pairs,
              {
                id: newId("pair"),
                statement: "Nova afirmação",
                answer: "Resposta",
              },
            ],
          })
        }
      >
        <Plus size={16} />
        Par de associação
      </button>
    </>
  );
}
