"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  Check,
  ExternalLink,
  LoaderCircle,
  Lock,
  TriangleAlert,
} from "lucide-react";
import { Modal } from "../../../components/modal.tsx";
import { AI_PRESETS } from "../../../../shared/ai-providers.ts";
import type { AiProvider, TabKey, TabKeys } from "../hooks/use-course-import.ts";
import { AI_NAME, AI_ORDER } from "./ai-names.ts";

type Problem = { field: "key" | "model" | "baseUrl"; text: string };

/**
 * "Adicionar chave": uma janelinha com a IA, a chave, o modelo e, na Outra IA, o endereço do serviço.
 * A chave só sobe para o estado da tela (nunca para localStorage, sessionStorage ou IndexedDB)
 * e some quando a aba fecha. O Modal prende o foco, fecha com Esc e devolve o foco ao select.
 * Quem já tem chave (nesta aba ou no servidor) pode só trocar o modelo: a chave em branco mantém a que já vale.
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
  // O teste da chave: rodando, deu certo (a janela fecha logo depois) ou falhou (com a frase do que fazer).
  const [testing, setTesting] = useState(false);
  const [outcome, setOutcome] = useState<
    { kind: "success" } | { kind: "failure"; text: string } | null
  >(null);
  const request = useRef<AbortController | null>(null);
  const closing = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // Qualquer mudança nos campos apaga o aviso e o resultado do teste anterior: eles eram de outra combinação.
  function clear() {
    setProblem(null);
    setOutcome(null);
  }
  // Fechar a janela (ou sair da tela) cancela um teste em andamento e a espera do "Funcionou!".
  useEffect(
    () => () => {
      request.current?.abort();
      if (closing.current) clearTimeout(closing.current);
    },
    [],
  );

  function choose(next: AiProvider) {
    setName(next);
    setKey("");
    setModel(keys[next]?.model ?? "");
    setBaseUrl(keys[next]?.baseUrl ?? "");
    clear();
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
    if (!typed && !hasKey) return fail("key", "Cole a chave.", keyRef);
    if (needsDetails && !baseUrl.trim())
      return fail("baseUrl", "Diga o endereço da IA.", urlRef);
    if (needsDetails && !model.trim())
      return fail("model", "Diga o modelo.", modelRef);
    void testAndUse();
  }

  /** O que a janela guarda: chave em branco fica com a que já vale (a desta aba, ou a do servidor, que não passa por aqui). */
  function chosen(): TabKey {
    return {
      apiKey: key.trim() || (keys[name]?.apiKey ?? ""),
      model: model.trim(),
      baseUrl: name === "custom" ? baseUrl.trim() : "",
    };
  }

  /** Faz uma chamada mínima de verdade pelo app (/api/import/test); só guarda a IA se ela responder. */
  async function testAndUse() {
    const value = chosen();
    const controller = new AbortController();
    request.current = controller;
    setTesting(true);
    setOutcome(null);
    try {
      const response = await fetch("/api/import/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: name,
          ...(value.apiKey ? { apiKey: value.apiKey } : {}),
          ...(value.model ? { model: value.model } : {}),
          ...(value.baseUrl ? { baseUrl: value.baseUrl } : {}),
        }),
        signal: controller.signal,
      });
      const result: unknown = await response.json();
      const text = (field: string): string | undefined => {
        const found = (result as Record<string, unknown> | null)?.[field];
        return typeof found === "string" ? found : undefined;
      };
      if ((result as { ok?: unknown } | null)?.ok === true) {
        setOutcome({ kind: "success" });
        // Um instante para a pessoa ver que funcionou, e então a janela guarda a IA e fecha.
        closing.current = setTimeout(() => onSave(name, value), 900);
        return;
      }
      const issues = (result as { issues?: { message?: unknown }[] } | null)
        ?.issues;
      const fromIssue =
        typeof issues?.[0]?.message === "string" ? issues[0].message : undefined;
      setOutcome({
        kind: "failure",
        text: text("message") ?? fromIssue ?? "Não consegui testar agora.",
      });
    } catch {
      if (!controller.signal.aborted)
        setOutcome({
          kind: "failure",
          text: "Não consegui falar com o aplicativo. Confira a conexão e tente de novo.",
        });
    } finally {
      if (request.current === controller) request.current = null;
      setTesting(false);
    }
  }

  const describedBy = (field: Problem["field"]) =>
    problem?.field === field ? `${errorId} ${noteId}` : noteId;

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
                  onChange={() => choose(value)}
                  // O foco abre na escolha da IA (a janelinha só olha o atributo, o React não o escreve).
                  ref={(node) => {
                    if (node && value === initial)
                      node.setAttribute("autofocus", "");
                  }}
                />
                <span>
                  {name === value && <Check size={18} aria-hidden="true" />}
                  {AI_NAME[value]}
                </span>
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
                clear();
              }}
            />
            {problem?.field === "baseUrl" && (
              <p className="entry-error" id={errorId} role="alert">
                <TriangleAlert size={16} aria-hidden="true" />
                {problem.text}
              </p>
            )}
          </div>
        )}
        <div className="entry-field">
          <label className="entry-label" htmlFor={keyId}>
            Chave
            {hasKey && <span className="entry-optional"> (já tem uma)</span>}
          </label>
          {/* Quem nunca usou uma chave não sabe onde ela nasce: o caminho fica ao lado do campo. */}
          {preset.keyUrl && (
            <a
              className="entry-inline entry-key-help"
              href={preset.keyUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Onde pego a chave?
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          )}
          <input
            id={keyId}
            ref={keyRef}
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
            value={key}
            aria-invalid={problem?.field === "key" ? true : undefined}
            aria-describedby={describedBy("key")}
            onChange={(event) => {
              setKey(event.target.value);
              clear();
            }}
          />
          {problem?.field === "key" && (
            <p className="entry-error" id={errorId} role="alert">
              <TriangleAlert size={16} aria-hidden="true" />
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
              clear();
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
              <TriangleAlert size={16} aria-hidden="true" />
              {problem.text}
            </p>
          )}
        </div>
        <p className="entry-note" id={noteId}>
          <Lock size={16} aria-hidden="true" />
          Fica só nesta aba.
        </p>
        {/* Sempre na página, vazia até haver resultado: o leitor de tela fala o resultado quando ele entra. */}
        <div className="entry-test-result" role="status" aria-live="polite">
          {testing && <p className="entry-note">Testando a chave…</p>}
          {outcome?.kind === "success" && (
            <p className="entry-note entry-success">
              <Check size={16} aria-hidden="true" />
              Funcionou! A IA respondeu.
            </p>
          )}
          {outcome?.kind === "failure" && (
            <p className="entry-error">
              <TriangleAlert size={16} aria-hidden="true" />
              {outcome.text}
            </p>
          )}
        </div>
        <div className="entry-dialog-actions">
          <button
            type="submit"
            className="primary entry-send"
            disabled={testing || outcome?.kind === "success"}
          >
            {testing && (
              <LoaderCircle className="spinner" size={20} aria-hidden="true" />
            )}
            {testing ? "Testando…" : "Testar e usar"}
          </button>
          {/* Se o teste falhou, quem sabe o que está fazendo (rede da escola, serviço fora do ar) ainda pode seguir. */}
          {outcome?.kind === "failure" && (
            <button
              type="button"
              className="entry-btn"
              onClick={() => onSave(name, chosen())}
            >
              Usar assim mesmo
            </button>
          )}
          <button type="button" className="entry-btn" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  );
}
