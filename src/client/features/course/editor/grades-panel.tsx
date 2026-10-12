"use client";
import { Plus, Save } from "lucide-react";
import { newId } from "../../../project.ts";
import type { CourseProject } from "../../../project.ts";
import type { CourseBuilderModel } from "../hooks/use-course-builder.ts";

import { promptName } from "../helpers.ts";

type Props = Pick<
  CourseBuilderModel,
  "commands" | "allActivities" | "setProject" | "setValidatedRevision"
>
  & { project: CourseProject; };

export function GradesPanel({
  project,
  commands,
  allActivities,
  setProject,
  setValidatedRevision
}: Props) {
  return (
    <>
      <h2>Avaliação e presets</h2>
      <p className="intro-help">
        Defina as categorias e os vínculos. Sem categorias, o curso
        conserva somente as notas máximas das atividades.
      </p>
      {project.draft.gradebook?.categories.map((category, index) => (
        <fieldset
          className="grade-category"
          key={category.id}
          id={`entity-${category.id}`}
        >
          <legend>Categoria {index + 1}</legend>
          <div className="field-grid">
            <label className="field">
              <span>Nome da categoria</span>
              <input
                data-field="name"
                value={category.name}
                onChange={(event) =>
                  commands([
                    {
                      type: "set_gradebook",
                      gradebook: {
                        categories:
                          project.draft.gradebook!.categories.map(
                            (entry) =>
                              entry.id === category.id
                                ? {
                                  ...entry,
                                  name: event.target.value,
                                }
                                : entry,
                          ),
                      },
                    },
                  ])
                }
              />
            </label>
            <label className="field">
              <span>Peso (%)</span>
              <input
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                data-field="weight"
                value={category.weight}
                onChange={(event) =>
                  commands([
                    {
                      type: "set_gradebook",
                      gradebook: {
                        categories:
                          project.draft.gradebook!.categories.map(
                            (entry) =>
                              entry.id === category.id
                                ? {
                                  ...entry,
                                  weight: Number(
                                    event.target.value,
                                  ),
                                }
                                : entry,
                          ),
                      },
                    },
                  ])
                }
              />
            </label>
          </div>
          {allActivities
            .filter(
              (entry) =>
                entry.type === "assignment" || entry.type === "quiz",
            )
            .map((entry) => (
              <label className="check-row" key={entry.id}>
                <input
                  type="checkbox"
                  data-field={`activityIds.${entry.id}`}
                  checked={category.activityIds.includes(entry.id)}
                  onChange={(event) =>
                    commands([
                      {
                        type: "set_gradebook",
                        gradebook: {
                          categories:
                            project.draft.gradebook!.categories.map(
                              (item) =>
                                item.id === category.id
                                  ? {
                                    ...item,
                                    activityIds: event.target
                                      .checked
                                      ? [
                                        ...item.activityIds,
                                        entry.id,
                                      ]
                                      : item.activityIds.filter(
                                        (id) => id !== entry.id,
                                      ),
                                  }
                                  : item,
                            ),
                        },
                      },
                    ])
                  }
                />
                {entry.title}
              </label>
            ))}
          <button
            type="button"
            className="text-button danger"
            onClick={() => {
              const categories =
                project.draft.gradebook!.categories.filter(
                  (entry) => entry.id !== category.id,
                );
              commands([
                {
                  type: "set_gradebook",
                  gradebook: categories.length
                    ? { categories }
                    : undefined,
                },
              ]);
            }}
          >
            Remover categoria
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        className="secondary"
        onClick={() =>
          commands([
            {
              type: "set_gradebook",
              gradebook: {
                categories: [
                  ...(project.draft.gradebook?.categories ?? []),
                  {
                    id: newId("category"),
                    name: "Nova categoria",
                    weight: project.draft.gradebook ? 50 : 100,
                    activityIds: allActivities
                      .filter(
                        (entry) =>
                          entry.type === "assignment" ||
                          entry.type === "quiz",
                      )
                      .map((entry) => entry.id),
                  },
                ],
              },
            },
          ])
        }
      >
        <Plus size={16} />
        Categoria de notas
      </button>
      <p className="field-help">
        Os pesos devem somar 100%. Cada atividade pertence a uma
        categoria.
      </p>
      <hr />
      <h3>Presets deste projeto</h3>
      <button
        type="button"
        className="secondary"
        onClick={() => {
          const presetName = promptName();
          if (!presetName) return;
          setProject({
            ...project,
            draft: {
              ...project.draft,
              revision: project.draft.revision + 1,
            },
            presets: [
              ...project.presets,
              {
                id: newId("preset"),
                name: presetName,
                organization: project.draft.metadata.organization,
                ...(project.draft.gradebook
                  ? {
                    gradebook: structuredClone(
                      project.draft.gradebook,
                    ),
                  }
                  : {}),
              },
            ],
          });
          setValidatedRevision(null);
        }}
      >
        <Save size={16} />
        Salvar organização como preset
      </button>
      {project.presets.map((preset) => (
        <div className="preset-row" key={preset.id}>
          <span>
            <strong>{preset.name}</strong>
            <small>
              {preset.organization === "weeks"
                ? "Semanas"
                : "Tópicos"}{" "}
              · {preset.gradebook?.categories.length ?? 0} categorias
            </small>
          </span>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              if (
                !confirm(
                  `Aplicar “${preset.name}”? A organização e as categorias serão substituídas; textos e atividades permanecem.`,
                )
              )
                return;
              commands(
                [
                  {
                    type: "set_metadata",
                    metadata: {
                      ...project.draft.metadata,
                      organization:
                        preset.organization ??
                        project.draft.metadata.organization,
                    },
                  },
                  {
                    type: "set_gradebook",
                    gradebook: structuredClone(preset.gradebook),
                  },
                ],
                project.draft.revision,
                "preset",
                preset.id,
              );
            }}
          >
            Conferir e aplicar
          </button>
        </div>
      ))}
    </>
  );
}
