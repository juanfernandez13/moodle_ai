"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { KeyRound, Plus, TriangleAlert } from "lucide-react";
import { z } from "zod";
import { Dropdown } from "../../../components/dropdown.tsx";
import { AI_PRESETS } from "../../../../shared/ai-providers.ts";
import type { CourseBuilderModel } from "../hooks/use-course-builder.ts";
import type { AiProblem, AiProvider, TabKeys } from "../hooks/use-course-import.ts";
import { AddKeyDialog } from "./add-key-dialog.tsx";
import { AI_NAME, AI_ORDER } from "./ai-names.ts";

/* --- IAs com chave no servidor (só diz se há chave, nunca a chave) --- */
const providerStatus = z.object({
  configured: z.boolean(),
  model: z.string().nullable(),
});
const providersSchema = z.object({
  providers: z.object({
    gemini: providerStatus,
    openai: providerStatus,
    claude: providerStatus,
    custom: providerStatus,
  }),
});
type ServerProviders = z.infer<typeof providersSchema>["providers"];
let knownProviders: ServerProviders | null = null;

// Pergunta uma vez: quando a pessoa abre a lista, a resposta já chegou.
function useServerProviders(): ServerProviders | null {
  const [providers, setProviders] = useState<ServerProviders | null>(
    knownProviders,
  );
  useEffect(() => {
    if (knownProviders) return;
    const abort = new AbortController();
    fetch("/api/import/providers", {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: abort.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("providers");
        return response.json() as Promise<unknown>;
      })
      .then((value) => {
        const parsed = providersSchema.safeParse(value);
        if (!parsed.success) return;
        knownProviders = parsed.data.providers;
        setProviders(parsed.data.providers);
      })
      // Sem resposta, a lista só oferece "Adicionar chave".
      .catch(() => undefined);
    return () => abort.abort();
  }, []);
  return providers;
}

/**
 * As IAs que já têm chave, na ordem da lista (Gemini, OpenAI, Claude, Outra IA), cada uma com a origem da chave.
 * A chave digitada nesta aba vale mais que a do servidor para a mesma IA.
 */
export function useAiChoices(keys: TabKeys) {
  const server = useServerProviders();
  const options = AI_ORDER.flatMap((name) => {
    // Só conta como "desta aba" quem tem chave digitada: dá para ter só o modelo trocado e a chave do servidor.
    const origin = keys[name]?.apiKey
      ? "desta aba"
      : server?.[name].configured
        ? "do servidor"
        : null;
    return origin
      ? [{ value: name, label: AI_NAME[name], hint: `chave ${origin}` }]
      : [];
  });
  return { server, options };
}
export type AiChoices = ReturnType<typeof useAiChoices>;

/** O que a janelinha mostra quando a IA recusou a chave: o aviso fica aqui, ao lado do que a pessoa vai trocar. */
const PROBLEM_TEXT: Record<Exclude<AiProblem, "">, [string, string]> = {
  invalid: ["A chave não funcionou.", "Trocar chave"],
  missing: ["Esta IA está sem chave.", "Adicionar chave"],
};

type Props = Pick<
  CourseBuilderModel,
  "provider" | "setProvider" | "keys" | "setKeys"
> & {
  choices: AiChoices;
  problem: AiProblem;
  /** Sem chave de IA, o balão oferece o outro caminho: criar o curso manualmente. */
  onManual: () => void;
  /** O botão principal e o motivo, dentro do mesmo cartão da escolha. */
  children: ReactNode;
};

/**
 * A coluna da IA. A coruja fica apoiada no cartão e pergunta "Qual IA vamos usar?" (o balão é o rótulo da lista).
 * A lista traz as IAs que já têm chave e, por último, a ação "Adicionar chave". Sem nenhuma IA com chave, o balão diz o
 * que fazer ("Vamos cadastrar uma IA?" e o caminho sem IA) e no lugar da lista fica um botão só: "Cadastrar IA".
 * Os dois caminhos abrem a mesma janelinha; ao salvar, a nova IA já fica escolhida.
 * Quando a IA recusa a chave, o aviso e o botão para trocá-la ficam logo abaixo da lista.
 */
export function AiSelect({
  provider,
  setProvider,
  keys,
  setKeys,
  choices,
  problem,
  onManual,
  children,
}: Props) {
  const { options } = choices;
  const selectId = useId();
  const selectRef = useRef<HTMLButtonElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  // IA que a janelinha mostra primeiro; null: janelinha fechada.
  const [adding, setAdding] = useState<AiProvider | null>(null);
  // O servidor já respondeu e nenhuma IA tem chave: não há o que escolher, só cadastrar.
  const empty = choices.server !== null && options.length === 0;
  // Ao salvar a primeira chave o botão dá lugar à lista: o foco vai para ela.
  const focusSelect = useRef(false);
  useEffect(() => {
    if (empty || !focusSelect.current) return;
    focusSelect.current = false;
    selectRef.current?.focus();
  }, [empty]);

  // Padrão: a primeira IA que já tem chave (Gemini antes de OpenAI). A pessoa pode trocar.
  const first = options[0]?.value ?? null;
  useEffect(() => {
    if (provider === null && first !== null) setProvider(first);
  }, [provider, first, setProvider]);

  const model =
    provider === null
      ? ""
      : keys[provider]?.model.trim() ||
        choices.server?.[provider].model ||
        AI_PRESETS[provider].defaultModel ||
        "";

  function openDialog(initial?: AiProvider) {
    // Quem ainda não tem chave vem primeiro; se todas têm, a que está escolhida (para trocar a chave).
    const missing = AI_ORDER.find(
      (name) => !options.some((option) => option.value === name),
    );
    setAdding(initial ?? missing ?? provider ?? AI_ORDER[0] ?? "gemini");
  }

  return (
    <div className="entry-ai-col">
      {/* A coruja é enfeite (desenhada pelo CSS); quem fala é o balão. */}
      <div className="entry-owl">
        <div className="entry-bubble">
          {empty ? (
            <>
              <p className="entry-bubble-say">Vamos cadastrar uma IA?</p>
              <p className="entry-bubble-info">
                Sem chave?{" "}
                <button type="button" className="entry-inline" onClick={onManual}>
                  Crie manualmente.
                </button>
              </p>
            </>
          ) : (
            <label className="entry-bubble-say" htmlFor={selectId}>
              Qual IA vamos usar?
            </label>
          )}
        </div>
        <span className="entry-owl-art" aria-hidden="true" />
      </div>
      <div className="entry-ai">
        <div className="entry-field">
          {empty ? (
            <button
              type="button"
              ref={addRef}
              className="entry-btn entry-add-ai"
              onClick={() => openDialog()}
            >
              <KeyRound size={18} aria-hidden="true" />
              Cadastrar IA
            </button>
          ) : (
            <Dropdown
              id={selectId}
              buttonRef={selectRef}
              value={provider}
              options={options}
              onChange={setProvider}
              placeholder="Escolha uma IA"
              // "Adicionar chave" é uma ação, não uma escolha: a IA escolhida continua a mesma.
              actions={[
                {
                  id: "add-key",
                  label: "Adicionar chave",
                  icon: <Plus size={16} />,
                  onSelect: () => openDialog(),
                },
              ]}
            />
          )}
          {/* Qual modelo vai ler os arquivos: o digitado nesta aba, senão o do servidor, senão o padrão da IA. */}
          {provider !== null && !empty && (
            <p className="entry-model">
              {model !== "" && (
                <span>
                  Modelo: <strong>{model}</strong>
                </span>
              )}
              <button
                type="button"
                className="entry-inline"
                onClick={() => openDialog(provider)}
              >
                {model !== "" ? "Mudar" : "Escolher o modelo"}
              </button>
            </p>
          )}
          {/* Sempre na página, vazia até chegar um aviso: o leitor de tela fala o aviso quando ele entra. */}
          <div className="entry-ai-live" role="alert">
            {problem !== "" && (
              <p className="entry-error">
                <TriangleAlert size={16} aria-hidden="true" />
                <span>
                  {PROBLEM_TEXT[problem][0]}{" "}
                  <button
                    type="button"
                    className="entry-inline"
                    onClick={() => openDialog(provider ?? undefined)}
                  >
                    {PROBLEM_TEXT[problem][1]}
                  </button>
                </span>
              </p>
            )}
          </div>
        </div>
        {children}
      </div>
      {adding !== null && (
        <AddKeyDialog
          initial={adding}
          keys={keys}
          serverKey={{
            gemini: choices.server?.gemini.configured ?? false,
            openai: choices.server?.openai.configured ?? false,
            claude: choices.server?.claude.configured ?? false,
            custom: choices.server?.custom.configured ?? false,
          }}
          returnFocus={empty ? addRef.current : selectRef.current}
          onClose={() => setAdding(null)}
          onSave={(name, key) => {
            focusSelect.current = empty;
            setKeys((previous) => ({ ...previous, [name]: key }));
            setProvider(name);
            setAdding(null);
          }}
        />
      )}
    </div>
  );
}
