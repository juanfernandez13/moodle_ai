"use client";
import { useId } from "react";
import {
  BookOpen,
  Braces,
  ClipboardPaste,
  Copy,
  FolderOpen,
} from "lucide-react";
import type { CourseBuilderModel } from "../hooks/use-course-builder.ts";

type Props = Pick<
  CourseBuilderModel,
  | "jsonText"
  | "setJsonText"
  | "importJson"
  | "example"
  | "setShowPrompt"
  | "proposalTrigger"
  | "portableInput"
> & {
  /** Vai para a tela de arquivos com o texto da Matriz para colar. */
  onPasteText: () => void;
};

/** Importar JSON: para quem já usa outra IA. Os outros jeitos de começar (cópia salva, texto) ficam aqui, como links pequenos. */
export function JsonImportPanel({
  jsonText,
  setJsonText,
  importJson,
  example,
  setShowPrompt,
  proposalTrigger,
  portableInput,
  onPasteText,
}: Props) {
  const helpId = useId();
  return (
    <div className="entry-json">
      <div className="entry-json-card">
        <label className="entry-card-title" htmlFor="entry-json">
          JSON do curso
        </label>
        <p className="entry-help" id={helpId}>
          Cole o que a outra IA devolveu.
        </p>
        <textarea
          id="entry-json"
          className="json-input"
          value={jsonText}
          spellCheck={false}
          autoComplete="off"
          aria-describedby={helpId}
          onChange={(event) => setJsonText(event.target.value)}
          placeholder={'{ "schemaVersion": 1, ... }'}
        />
      </div>
      <div className="entry-json-actions">
        <div className="entry-json-links">
          <button type="button" className="entry-link" onClick={example}>
            <BookOpen size={18} aria-hidden="true" />
            Ver exemplo
          </button>
          <button
            type="button"
            className="entry-link"
            onClick={() => setShowPrompt(true)}
          >
            <Copy size={18} aria-hidden="true" />
            Copiar prompt
          </button>
          <button type="button" className="entry-link" onClick={onPasteText}>
            <ClipboardPaste size={18} aria-hidden="true" />
            Colar texto
          </button>
          <button
            type="button"
            className="entry-link"
            onClick={(event) => {
              proposalTrigger.current = event.currentTarget;
              portableInput.current?.click();
            }}
          >
            <FolderOpen size={18} aria-hidden="true" />
            Abrir cópia salva
          </button>
        </div>
        <button
          type="button"
          className="primary entry-send"
          onClick={(event) => importJson(event.currentTarget)}
        >
          <Braces size={20} aria-hidden="true" />
          Abrir JSON
        </button>
      </div>
    </div>
  );
}
