"use client";
import type { Activity, Question } from "../../../domain/course/index.ts";
import type { ProjectFile } from "../../project.ts";
import { makeQuestion } from "../../project.ts";
import { Plus } from "lucide-react";
import { QuestionEditor } from "./question-editor.tsx";
import { reorder } from "./editor-helpers.ts";
type Props = {
  activity: Extract<Activity, { type: "quiz" }>;
  pane: string;
  assets: ProjectFile[];
  onChange: (activity: Activity) => void;
  focusPath?: string | undefined;
  selectedQuestion: Question | undefined;
  setQuestionId: (id: string) => void
};

export function QuizEditor({
  activity,
  pane,
  assets,
  onChange,
  focusPath,
  selectedQuestion,
  setQuestionId
}: Props) {
  return (
    <>
      <div hidden={pane !== "settings"}>
        <div className="field-grid">
          <label className="field">
            <span>Nota máxima do quiz</span>
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
            <span>Tentativas (0 = ilimitadas)</span>
            <input
              type="number"
              min="0"
              max="100"
              data-field="settings.attempts"
              value={activity.settings.attempts}
              onChange={(event) =>
                onChange({
                  ...activity,
                  settings: {
                    ...activity.settings,
                    attempts: Number(event.target.value),
                  },
                })
              }
            />
          </label>
        </div>
        <label className="check-row">
          <input
            type="checkbox"
            data-field="settings.shuffleQuestions"
            checked={activity.settings.shuffleQuestions}
            onChange={(event) =>
              onChange({
                ...activity,
                settings: {
                  ...activity.settings,
                  shuffleQuestions: event.target.checked,
                },
              })
            }
          />
          Embaralhar questões
        </label>
      </div>
      <div hidden={pane !== "questions"}>
        <div className="question-navigation">
          <label className="field">
            <span>Questão em edição</span>
            <select
              value={selectedQuestion?.id ?? ""}
              onChange={(event) => setQuestionId(event.target.value)}
            >
              {activity.questions.map((question, index) => (
                <option key={question.id} value={question.id}>
                  Questão {index + 1}:{" "}
                  {question.type === "multiple-choice"
                    ? "Múltipla escolha"
                    : question.type === "matching"
                      ? "Associação"
                      : "Discursiva"}
                </option>
              ))}
            </select>
          </label>
          <span className="field-help">
            {activity.questions.length}{" "}
            {activity.questions.length === 1 ? "questão" : "questões"} no
            quiz
          </span>
        </div>
        {activity.questions.map((question, index) =>
          question.id === selectedQuestion?.id ? (
            <QuestionEditor
              key={question.id}
              question={question}
              index={index}
              assets={assets}
              focusPath={focusPath}
              count={activity.questions.length}
              onMove={(destination) =>
                onChange({
                  ...activity,
                  questions: reorder(
                    activity.questions,
                    index,
                    destination,
                  ),
                })
              }
              onChange={(next) =>
                onChange({
                  ...activity,
                  questions: activity.questions.map((entry) =>
                    entry.id === question.id ? next : entry,
                  ),
                })
              }
              onRemove={() =>
                onChange({
                  ...activity,
                  questions: activity.questions.filter(
                    (entry) => entry.id !== question.id,
                  ),
                })
              }
            />
          ) : null,
        )}
        <div className="add-questions">
          <strong>Adicionar questão</strong>
          <div className="button-row">
            {[
              ["multiple-choice", "Múltipla escolha"],
              ["matching", "Associação"],
              ["essay", "Discursiva"],
            ].map(([type, label]) => (
              <button
                key={type}
                type="button"
                className="secondary"
                onClick={() => {
                  const next = makeQuestion(type);
                  setQuestionId(next.id);
                  onChange({
                    ...activity,
                    questions: [...activity.questions, next],
                  });
                }}
              >
                <Plus size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
