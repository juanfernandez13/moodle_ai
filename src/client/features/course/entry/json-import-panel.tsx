"use client";
import { Code2 } from "lucide-react";
import type { CourseBuilderModel } from "../hooks/use-course-builder.ts";

type Props = Pick<
  CourseBuilderModel,
  "jsonText" | "setJsonText" | "importJson"
>;

export function JsonImportPanel({ jsonText, setJsonText, importJson }: Props) {
  return (
    <>
      <label className="field">
        <span>CourseDraft em JSON</span>
        <textarea
          className="json-input"
          value={jsonText}
          onChange={(event) => setJsonText(event.target.value)}
          placeholder={'{ "schemaVersion": 1, ... }'}
        />
      </label>
      <button
        type="button"
        className="primary entry-primary"
        onClick={(event) => importJson(event.currentTarget)}
      >
        <Code2 size={18} />
        Validar e conferir JSON
      </button>
      <p className="field-help">
        Referências sem arquivos aparecerão como pendências no editor.
      </p>
    </>
  );
}
