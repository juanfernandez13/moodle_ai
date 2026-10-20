"use client";
import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ChevronDown, Lock, TriangleAlert } from "lucide-react";
import { Modal } from "../../../components/modal.tsx";
import type { AiProvider, TabKey } from "../hooks/use-course-import.ts";
import { AI_NAME, AI_ORDER } from "./ai-names.ts";

/**
 * "Adicionar chave": uma janelinha com a IA, a chave e, escondido, o modelo.
 * A chave só sobe para o estado da tela (nunca para localStorage, sessionStorage ou IndexedDB)
 * e some quando a aba fecha. O Modal prende o foco, fecha com Esc e devolve o foco ao select.
 */
export function AddKeyDialog({
  initial,
  returnFocus,
  onSave,
  onClose,
}: {
  initial: AiProvider;
  returnFocus: HTMLElement | null;
  onSave: (provider: AiProvider, key: TabKey) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState<AiProvider>(initial);
  const [key, setKey] = useState("");
  const [model, setModel] = useState("");
  const [missing, setMissing] = useState(false);
  const keyRef = useRef<HTMLInputElement>(null);
  const radioName = useId();
  const keyId = useId();
  const errorId = useId();
  const modelId = useId();
  const noteId = useId();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const typed = key.trim();
    if (!typed) {
      // O aviso fica junto do campo, e o foco vai para ele.
      setMissing(true);
      keyRef.current?.focus();
      return;
    }
    onSave(name, { apiKey: typed, model: model.trim() });
  }

  return (
    <Modal title="Adicionar chave" onClose={onClose} returnFocus={returnFocus}>
      <form
        className="entry-key-dialog"
        noValidate
        autoComplete="off"
        onSubmit={submit}
      >
        <fieldset className="entry-pick">
          <legend className="entry-label">Qual IA?</legend>
          <div className="entry-pills">
            {AI_ORDER.map((value) => (
              <label className="entry-pill" key={value}>
                <input
                  className="visually-hidden"
                  type="radio"
                  name={radioName}
                  value={value}
                  checked={name === value}
                  onChange={() => setName(value)}
                  // O foco abre na escolha da IA (a janelinha só olha o atributo, o React não o escreve).
                  ref={(node) => {
                    if (node && value === initial)
                      node.setAttribute("autofocus", "");
                  }}
                />
                <span>{AI_NAME[value]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="entry-field">
          <label className="entry-label" htmlFor={keyId}>
            Chave
          </label>
          <input
            id={keyId}
            ref={keyRef}
            className="entry-input"
            type="password"
            required
            maxLength={2000}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            data-1p-ignore="true"
            data-lpignore="true"
            data-bwignore="true"
            data-form-type="other"
            value={key}
            aria-invalid={missing ? true : undefined}
            aria-describedby={missing ? `${errorId} ${noteId}` : noteId}
            onChange={(event) => {
              setKey(event.target.value);
              setMissing(false);
            }}
          />
          {missing && (
            <p className="entry-error" id={errorId} role="alert">
              <TriangleAlert size={16} aria-hidden="true" />
              Cole a chave.
            </p>
          )}
        </div>
        <details className="entry-more">
          <summary>
            <ChevronDown size={16} aria-hidden="true" />
            Mais opções
          </summary>
          <div className="entry-field">
            <label className="entry-label" htmlFor={modelId}>
              Modelo <span className="entry-optional">(opcional)</span>
            </label>
            <input
              id={modelId}
              className="entry-input"
              maxLength={200}
              autoComplete="off"
              spellCheck={false}
              value={model}
              onChange={(event) => setModel(event.target.value)}
            />
          </div>
        </details>
        <p className="entry-note" id={noteId}>
          <Lock size={16} aria-hidden="true" />
          Fica só nesta aba.
        </p>
        <div className="entry-dialog-actions">
          <button type="submit" className="primary entry-send">
            Salvar
          </button>
          <button type="button" className="entry-btn" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}
