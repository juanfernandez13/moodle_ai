"use client";
import { useState } from "react";
import type { Question } from "../../../domain/course/index.ts";
import type { ProjectFile } from "../../project.ts";
import { RichEditor } from "../content.tsx";
import { richBlockFocus } from "../../navigation.ts";
import { Trash2 } from "lucide-react";
import { OrderControls } from "./order-controls.tsx";
import { MultipleChoiceAnswers } from "./multiple-choice-answers.tsx";
import { MatchingAnswers } from "./matching-answers.tsx";
import { EssayAnswerSettings } from "./essay-answer-settings.tsx";

export function QuestionEditor({
  question,
  index,
  assets,
  onChange,
  onRemove,
  count,
  onMove,
  focusPath,
}: {
  question: Question;
  index: number;
  assets: ProjectFile[];
  onChange: (question: Question) => void;
  onRemove: () => void;
  count: number;
  onMove: (destination: number) => void;
  focusPath?: string | undefined;
}) {
  const [pane, setPane] = useState(
    focusPath && /\.(options|pairs|settings)/.test(focusPath)
      ? "answers"
      : focusPath?.includes("feedback")
        ? "feedback"
        : "statement",
  );
  const questionPath = focusPath?.match(/^(.*\.questions\[\d+\])/)?.[1] ?? "";
  return (
    <fieldset className="question-editor" id={`entity-${question.id}`}>
      <legend>
        Questão {index + 1}:{" "}
        {question.type === "multiple-choice"
          ? "Múltipla escolha"
          : question.type === "matching"
            ? "Associação"
            : "Discursiva"}
      </legend>
      <div className="button-row end">
        <OrderControls
          label={`questão ${index + 1}`}
          index={index}
          count={count}
          move={onMove}
        />
        <button className="text-button danger" type="button" onClick={onRemove}>
          <Trash2 size={16} />
          Remover questão
        </button>
      </div>
      <nav className="panel-tabs compact" aria-label="Campos da questão">
        {[
          ["statement", "Enunciado"],
          ["answers", question.type === "essay" ? "Resposta" : "Alternativas"],
          ["feedback", "Feedback"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={pane === id}
            onClick={() => setPane(id!)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div hidden={pane !== "statement"}>
        <label className="field">
          <span>Enunciado</span>
          <textarea
            data-field="statement"
            value={question.statement}
            onChange={(event) =>
              onChange({ ...question, statement: event.target.value })
            }
          />
        </label>
        <RichEditor
          label="Enunciado"
          fallback={question.statement}
          blocks={question.statementBlocks}
          focusBlock={richBlockFocus(
            focusPath,
            `${questionPath}.statementBlocks`,
          )}
          focusPath={focusPath}
          assets={assets}
          onChange={(blocks) =>
            onChange({ ...question, statementBlocks: blocks })
          }
        />
      </div>
      <div hidden={pane !== "feedback"}>
        <label className="field">
          <span>Feedback geral</span>
          <textarea
            data-field="feedback"
            value={question.feedback}
            onChange={(event) =>
              onChange({ ...question, feedback: event.target.value })
            }
          />
        </label>
        <RichEditor
          label="Feedback"
          fallback={question.feedback}
          blocks={question.feedbackBlocks}
          focusBlock={richBlockFocus(
            focusPath,
            `${questionPath}.feedbackBlocks`,
          )}
          focusPath={focusPath}
          assets={assets}
          onChange={(blocks) =>
            onChange({ ...question, feedbackBlocks: blocks })
          }
        />
      </div>
      <label className="field short" hidden={pane !== "statement"}>
        <span>Peso da questão</span>
        <input
          type="number"
          min="0.01"
          step="0.01"
          data-field="maxMark"
          value={question.maxMark ?? 1}
          onChange={(event) =>
            onChange({ ...question, maxMark: Number(event.target.value) })
          }
        />
      </label>
      {question.type === "multiple-choice" && pane === "answers" && (
        <MultipleChoiceAnswers
          question={question}
          onChange={onChange}
          assets={assets}
          focusPath={focusPath}
          questionPath={questionPath}
        />
      )}
      {question.type === "matching" && pane === "answers" && (
        <MatchingAnswers
          question={question}
          onChange={onChange}
          assets={assets}
          focusPath={focusPath}
          questionPath={questionPath}
        />
      )}
      {question.type === "essay" && pane === "answers" && (
        <EssayAnswerSettings question={question} onChange={onChange} />
      )}
    </fieldset>
  );
}
