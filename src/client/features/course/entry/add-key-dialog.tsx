"use client";
import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ExternalLink, Lock, TriangleAlert } from "lucide-react";
import { Modal } from "../../../components/modal.tsx";
import { AI_PRESETS } from "../../../../shared/ai-providers.ts";
import type { AiProvider, TabKey, TabKeys } from "../hooks/use-course-import.ts";
import { AI_NAME, AI_ORDER } from "./ai-names.ts";

type Problem = { field: "key" | "model" | "baseUrl"; text: string };

/**
 * "Adicionar chave": uma janelinha com a IA, a chave, o modelo e, na Outra IA, o endereço do serviço.
 * A chave só sobe para o estado da tela (nunca para localStorage, sessionStorage ou IndexedDB)
 * e some quando a aba fecha. O Modal prende o foco, fecha com Esc e devolve o foco a quem a abriu.
 * Quem já tem chave (nesta aba ou no servidor) pode só trocar o modelo: a chave em branco mantém a que já vale.
 * A janela só guarda: nenhuma chamada à IA é feita aqui (não gasta nada). Se a chave não valer, o aviso aparece
 * ao enviar os arquivos, com o botão para trocá-la.
 */
export function AddKeyDialog({
  initial,
  keys,
  serverKey,
  returnFocus,
  onSave,
  onClose,
}: {
  initial: AiProvider;
  /** O que já foi digitado nesta aba, para a janela abrir com o modelo e o endereço de cada IA. */
  keys: TabKeys;
  /** Quais IAs têm chave no servidor. */
  serverKey: Readonly<Partial<Record<AiProvider, boolean>>>;
  returnFocus: HTMLElement | null;
  onSave: (provider: AiProvider, key: TabKey) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState<AiProvider>(initial);
  const [key, setKey] = useState("");
  const [model, setModel] = useState(keys[initial]?.model ?? "");
  const [baseUrl, setBaseUrl] = useState(keys[initial]?.baseUrl ?? "");
  const [problem, setProblem] = useState<Problem | null>(null);
  const keyRef = useRef<HTMLInputElement>(null);
  const modelRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const radioName = useId();
  const keyId = useId();
  const errorId = useId();
  const modelId = useId();
  const listId = useId();
  const urlId = useId();
  const noteId = useId();

  const preset = AI_PRESETS[name];
  // Já há chave valendo (digitada nesta aba ou no servidor): a janela serve só para mudar o resto.
  const hasKey = Boolean(keys[name]?.apiKey) || serverKey[name] === true;
  // A Outra IA não tem padrão: sem o servidor para completar, o modelo e o endereço precisam ser ditos.
  const needsDetails = name === "custom" && serverKey.custom !== true;

  function choose(next: AiProvider) {
    setName(next);
    setKey("");
    setModel(keys[next]?.model ?? "");
    setBaseUrl(keys[next]?.baseUrl ?? "");
    setProblem(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const typed = key.trim();
    const fail = (
      field: Problem["field"],
      text: string,
      ref: { current: HTMLInputElement | null },
    ) => {
      // O aviso fica junto do campo, e o foco vai para ele.
      setProblem({ field, text });
      ref.current?.focus();
    };
    if (needsDetails && !baseUrl.trim())
      return fail("baseUrl", "Diga o endereço da IA.", urlRef);
    if (!typed && !hasKey) return fail("key", "Cole a chave.", keyRef);
    if (needsDetails && !model.trim())
      return fail("model", "Diga o modelo.", modelRef);
    // Chave em branco fica com a que já vale (a desta aba, ou a do servidor, que não passa por aqui).
    onSave(name, {
      apiKey: typed || (keys[name]?.apiKey ?? ""),
      model: model.trim(),
      baseUrl: name === "custom" ? baseUrl.trim() : "",
    });
  }

  const describedBy = (field: Problem["field"]) =>
    problem?.field === field ? `${errorId} ${noteId}` : noteId;

  return (
    <Modal
      title={hasKey ? "Chave da IA" : "Adicionar chave"}
      onClose={onClose}
      returnFocus={returnFocus}
    >
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
                  onChange={() => choose(value)}
                />
                <span>{AI_NAME[value]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {name === "custom" && (
          <div className="entry-field">
            <label className="entry-label" htmlFor={urlId}>
              Endereço
              {!needsDetails && <span className="entry-optional"> (opcional)</span>}
            </label>
            <input
              id={urlId}
              ref={urlRef}
              className="entry-input"
              type="url"
              inputMode="url"
              maxLength={500}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder="https://openrouter.ai/api/v1"
              value={baseUrl}
              aria-invalid={problem?.field === "baseUrl" ? true : undefined}
              aria-describedby={describedBy("baseUrl")}
              onChange={(event) => {
                setBaseUrl(event.target.value);
                setProblem(null);
              }}
            />
            {problem?.field === "baseUrl" && (
              <p className="entry-error" id={errorId} role="alert">
                <TriangleAlert size={14} aria-hidden="true" />
                {problem.text}
              </p>
            )}
          </div>
        )}
        <div className="entry-field">
          <div className="entry-key-row">
            <label className="entry-label" htmlFor={keyId}>
              Chave
              {hasKey && <span className="entry-optional"> (já tem uma)</span>}
            </label>
            {/* Quem nunca usou uma chave não sabe onde ela nasce: o caminho fica ao lado do rótulo. */}
            {preset.keyUrl && (
              <a
                className="entry-inline entry-key-help"
                href={preset.keyUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Onde pego a chave?
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            )}
          </div>
          <input
            id={keyId}
            ref={(node) => {
              keyRef.current = node;
              // O foco abre na chave, que é o que a pessoa veio colar (a janelinha só olha o atributo, o React não o escreve).
              node?.setAttribute("autofocus", "");
            }}
            className="entry-input"
            type="password"
            required={!hasKey}
            maxLength={2000}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            data-1p-ignore="true"
            data-lpignore="true"
            data-bwignore="true"
            data-form-type="other"
            placeholder={hasKey ? "Em branco, fica a que já vale" : "Cole aqui"}
            value={key}
            aria-invalid={problem?.field === "key" ? true : undefined}
            aria-describedby={describedBy("key")}
            onChange={(event) => {
              setKey(event.target.value);
              setProblem(null);
            }}
          />
          {problem?.field === "key" && (
            <p className="entry-error" id={errorId} role="alert">
              <TriangleAlert size={14} aria-hidden="true" />
              {problem.text}
            </p>
          )}
        </div>
        <div className="entry-field">
          <label className="entry-label" htmlFor={modelId}>
            Modelo
            {!needsDetails && <span className="entry-optional"> (opcional)</span>}
          </label>
          <input
            id={modelId}
            ref={modelRef}
            className="entry-input"
            maxLength={200}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            list={preset.suggestions.length > 0 ? listId : undefined}
            // O padrão aparece como dica: em branco, é ele que vale.
            placeholder={preset.defaultModel ?? "nome do modelo"}
            value={model}
            aria-invalid={problem?.field === "model" ? true : undefined}
            aria-describedby={describedBy("model")}
            onChange={(event) => {
              setModel(event.target.value);
              setProblem(null);
            }}
          />
          {preset.suggestions.length > 0 && (
            <datalist id={listId}>
              {preset.suggestions.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          )}
          {problem?.field === "model" && (
            <p className="entry-error" id={errorId} role="alert">
              <TriangleAlert size={14} aria-hidden="true" />
              {problem.text}
            </p>
          )}
        </div>
        <p className="entry-note" id={noteId}>
          <Lock size={14} aria-hidden="true" />
          Fica só nesta aba.
        </p>
        <div className="entry-dialog-actions">
          <button type="button" className="entry-btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="primary entry-send">
            {hasKey ? "Salvar" : "Adicionar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
