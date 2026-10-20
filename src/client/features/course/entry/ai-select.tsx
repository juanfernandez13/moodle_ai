"use client";
import { useEffect, useId, useRef, useState } from "react";
import { z } from "zod";
import type { CourseBuilderModel } from "../hooks/use-course-builder.ts";
import type { AiProvider } from "../hooks/use-course-import.ts";
import { AddKeyDialog } from "./add-key-dialog.tsx";
import { AI_NAME, AI_ORDER } from "./ai-names.ts";

type Props = Pick<
  CourseBuilderModel,
  "provider" | "setProvider" | "keys" | "setKeys"
>;

const ADD_KEY = "add-key";

/* --- IAs com chave no servidor (só diz se há chave, nunca a chave) --- */
const providersSchema = z.object({
  providers: z.object({
    openai: z.object({ configured: z.boolean(), model: z.string().nullable() }),
    gemini: z.object({ configured: z.boolean(), model: z.string().nullable() }),
  }),
});
type ServerProviders = z.infer<typeof providersSchema>["providers"];
let knownProviders: ServerProviders | null = null;

// Pergunta uma vez: quando a pessoa abre o select, a resposta já chegou.
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
      // Sem resposta, o select só oferece "Adicionar chave…".
      .catch(() => undefined);
    return () => abort.abort();
  }, []);
  return providers;
}

/**
 * "IA": um select com as IAs que já têm chave e, por último, "Adicionar chave…".
 * A chave digitada nesta aba vale mais que a do servidor para a mesma IA.
 * Escolher "Adicionar chave…" abre uma janelinha; ao salvar, a nova IA já fica escolhida.
 */
export function AiSelect({ provider, setProvider, keys, setKeys }: Props) {
  const server = useServerProviders();
  const selectId = useId();
  const helpId = useId();
  const selectRef = useRef<HTMLSelectElement>(null);
  // IA que a janelinha mostra primeiro; null: janelinha fechada.
  const [adding, setAdding] = useState<AiProvider | null>(null);

  const options = AI_ORDER.flatMap((name) => {
    const origin = keys[name]
      ? "desta aba"
      : server?.[name].configured
        ? "do servidor"
        : null;
    return origin
      ? [{ value: name, label: `${AI_NAME[name]} · chave ${origin}` }]
      : [];
  });

  // Padrão: a primeira IA que o servidor já tem (Gemini antes de OpenAI). A pessoa pode trocar.
  useEffect(() => {
    if (provider !== null || !server) return;
    const first = AI_ORDER.find((name) => server[name].configured);
    if (first) setProvider(first);
  }, [provider, server, setProvider]);

  function openDialog() {
    // Quem ainda não tem chave vem primeiro; se todas têm, a que está escolhida (para trocar a chave).
    const missing = AI_ORDER.find(
      (name) => !options.some((option) => option.value === name),
    );
    setAdding(missing ?? provider ?? AI_ORDER[0] ?? "gemini");
  }

  return (
    <div className="entry-field">
      <label className="entry-label" htmlFor={selectId}>
        IA
      </label>
      <select
        id={selectId}
        ref={selectRef}
        className="entry-select"
        value={provider ?? ""}
        aria-describedby={helpId}
        onChange={(event) => {
          const value = event.target.value;
          // "Adicionar chave…" é uma ação, não uma escolha: o select volta para o que estava.
          if (value === ADD_KEY) openDialog();
          else if (value === "gemini" || value === "openai") setProvider(value);
        }}
      >
        {provider === null && (
          <option value="" disabled>
            Escolha uma IA
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        <option value={ADD_KEY}>Adicionar chave…</option>
      </select>
      <p className="entry-help" id={helpId}>
        Lê a Matriz e monta o curso.
      </p>
      {adding !== null && (
        <AddKeyDialog
          initial={adding}
          returnFocus={selectRef.current}
          onClose={() => setAdding(null)}
          onSave={(name, key) => {
            setKeys((previous) => ({ ...previous, [name]: key }));
            setProvider(name);
            setAdding(null);
          }}
        />
      )}
    </div>
  );
}
