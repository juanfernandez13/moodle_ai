"use client";
import { useState } from "react";
import type { Activity, Question } from "../../domain/course/index.ts";
import type { ProjectFile } from "../project.ts";
import { makeQuestion, newId } from "../project.ts";
import { RichEditor } from "./content.tsx";
import { richBlockFocus } from "../navigation.ts";
import { utcFieldValue, utcTimestamp } from "../dates.ts";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

function reorder<T>(values: T[], from: number, to: number): T[] {
  const next = [...values];
  const value = next.splice(from, 1)[0]!;
  next.splice(to, 0, value);
  return next;
}
function OrderControls({
  label,
  index,
  count,
  move,
}: {
  label: string;
  index: number;
  count: number;
  move: (destination: number) => void;
}) {
  return (
    <span className="icon-actions">
      <button
        type="button"
        aria-label={`Subir ${label}`}
        disabled={index === 0}
        onClick={() => move(index - 1)}
      >
        <ArrowUp size={16} />
      </button>
      <button
        type="button"
        aria-label={`Descer ${label}`}
        disabled={index === count - 1}
        onClick={() => move(index + 1)}
      >
        <ArrowDown size={16} />
      </button>
    </span>
  );
}

const dateValue = utcFieldValue;
const timestamp = utcTimestamp;

function QuestionEditor({
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
      )}
      {question.type === "matching" && pane === "answers" && (
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
      )}
      {question.type === "essay" && pane === "answers" && (
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
      )}
    </fieldset>
  );
}

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
      <nav className="panel-tabs" aria-label="Edição da atividade">
        {[
          ["content", "Conteúdo"],
          ["settings", "Configuração e datas"],
          ...(activity.type === "quiz" ? [["questions", "Questões"]] : []),
          ...(activity.type === "glossary" ? [["entries", "Conceitos"]] : []),
          ["attachments", "Anexos"],
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
      <div hidden={pane !== "content"}>
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
      <div className="field-grid" hidden={pane !== "settings"}>
        <label className="field">
          <span>Abertura (UTC)</span>
          <input
            type="datetime-local"
            data-field="schedule.opensAt"
            value={dateValue(activity.schedule?.opensAt)}
            onChange={(event) => setSchedule("opensAt", event.target.value)}
          />
        </label>
        <label className="field">
          <span>Fechamento (UTC)</span>
          <input
            type="datetime-local"
            data-field="schedule.closesAt"
            value={dateValue(activity.schedule?.closesAt)}
            onChange={(event) => setSchedule("closesAt", event.target.value)}
          />
        </label>
      </div>
      {activity.type === "forum" && pane === "settings" && (
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
      {activity.type === "quiz" && (
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
      )}
      {activity.type === "glossary" && (
        <>
          <div hidden={pane !== "settings"}>
            <label className="check-row">
              <input
                type="checkbox"
                data-field="settings.allowDuplicates"
                checked={activity.settings.allowDuplicates}
                onChange={(event) =>
                  onChange({
                    ...activity,
                    settings: {
                      ...activity.settings,
                      allowDuplicates: event.target.checked,
                    },
                  })
                }
              />
              Permitir conceitos repetidos
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                data-field="settings.requireApproval"
                checked={activity.settings.requireApproval}
                onChange={(event) =>
                  onChange({
                    ...activity,
                    settings: {
                      ...activity.settings,
                      requireApproval: event.target.checked,
                    },
                  })
                }
              />
              Exigir aprovação de novas entradas
            </label>
            <label className="field short">
              <span>Entradas por página</span>
              <input
                type="number"
                min="1"
                max="100"
                data-field="settings.entriesPerPage"
                value={activity.settings.entriesPerPage}
                onChange={(event) =>
                  onChange({
                    ...activity,
                    settings: {
                      ...activity.settings,
                      entriesPerPage: Number(event.target.value),
                    },
                  })
                }
              />
            </label>
          </div>
          <div hidden={pane !== "entries"}>
            <label className="field">
              <span>Conceito em edição</span>
              <select
                value={selectedEntry?.id ?? ""}
                onChange={(event) => setEntryId(event.target.value)}
              >
                {activity.entries.map((entry, index) => (
                  <option key={entry.id} value={entry.id}>
                    {index + 1}. {entry.concept}
                  </option>
                ))}
              </select>
            </label>
            {activity.entries.map((entry, index) =>
              entry.id === selectedEntry?.id ? (
                <fieldset
                  className="question-editor"
                  key={entry.id}
                  id={`entity-${entry.id}`}
                >
                  <legend>Conceito {index + 1}</legend>
                  <OrderControls
                    label={`conceito ${index + 1}`}
                    index={index}
                    count={activity.entries.length}
                    move={(destination) =>
                      onChange({
                        ...activity,
                        entries: reorder(activity.entries, index, destination),
                      })
                    }
                  />
                  <label className="field">
                    <span>Conceito</span>
                    <input
                      data-field="concept"
                      value={entry.concept}
                      onChange={(event) =>
                        onChange({
                          ...activity,
                          entries: activity.entries.map((item) =>
                            item.id === entry.id
                              ? { ...item, concept: event.target.value }
                              : item,
                          ),
                        })
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Definição</span>
                    <textarea
                      data-field="definition"
                      value={entry.definition}
                      onChange={(event) =>
                        onChange({
                          ...activity,
                          entries: activity.entries.map((item) =>
                            item.id === entry.id
                              ? { ...item, definition: event.target.value }
                              : item,
                          ),
                        })
                      }
                    />
                  </label>
                  <RichEditor
                    label="Definição"
                    fallback={entry.definition}
                    blocks={entry.definitionBlocks}
                    focusBlock={richBlockFocus(
                      focusPath,
                      `${focusPath?.match(/^(.*\.activities\[\d+\])/)?.[1] ?? ""}.entries[${index}].definitionBlocks`,
                    )}
                    focusPath={focusPath}
                    assets={assets}
                    onChange={(blocks) =>
                      onChange({
                        ...activity,
                        entries: activity.entries.map((item) =>
                          item.id === entry.id
                            ? { ...item, definitionBlocks: blocks }
                            : item,
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    className="text-button danger"
                    onClick={() =>
                      onChange({
                        ...activity,
                        entries: activity.entries.filter(
                          (item) => item.id !== entry.id,
                        ),
                      })
                    }
                  >
                    Remover conceito
                  </button>
                </fieldset>
              ) : null,
            )}
            <button
              type="button"
              className="secondary"
              onClick={() => {
                const entry = {
                  id: newId("entry"),
                  concept: "Novo conceito",
                  definition: "Escreva a definição.",
                };
                setEntryId(entry.id);
                onChange({
                  ...activity,
                  entries: [...activity.entries, entry],
                });
              }}
            >
              <Plus size={16} />
              Conceito
            </button>
          </div>
        </>
      )}
      <fieldset className="attachment-selector" hidden={pane !== "attachments"}>
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
  );
}
