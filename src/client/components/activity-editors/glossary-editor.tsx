"use client";
import type { Activity } from "../../../domain/course/index.ts";
import type { ProjectFile } from "../../project.ts";
import { newId } from "../../project.ts";
import { RichEditor } from "../content.tsx";
import { richBlockFocus } from "../../navigation.ts";
import { Plus } from "lucide-react";
import { OrderControls } from "./order-controls.tsx";
import { reorder } from "./editor-helpers.ts";
type GlossaryActivity = Extract<Activity, { type: "glossary" }>;
type Props = {
  activity: GlossaryActivity;
  pane: string;
  assets: ProjectFile[];
  onChange: (activity: Activity) => void;
  focusPath?: string | undefined;
  selectedEntry: GlossaryActivity["entries"][number] | undefined;
  setEntryId: (id: string) => void
};

export function GlossaryEditor({
  activity,
  pane,
  assets,
  onChange,
  focusPath,
  selectedEntry,
  setEntryId
}: Props) {
  return (
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
  );
}
