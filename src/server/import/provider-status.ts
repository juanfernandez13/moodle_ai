import type { ImportProvider } from "./types.ts";

/** Provedores que dependem de chave; o perfil offline não tem credencial. */
export type KeyedProvider = Exclude<ImportProvider, "offline">;

export interface ProviderStatus {
  /** Há uma chave não vazia configurada no servidor. */
  configured: boolean;
  /** Modelo definido no servidor, ou null para usar o padrão da aplicação. */
  model: string | null;
}

export interface ProviderStatusResponse {
  providers: Record<KeyedProvider, ProviderStatus>;
}

type Environment = Readonly<Record<string, string | undefined>>;

// Mesmos nomes que src/server/import/providers.ts consulta ao interpretar.
const VARIABLES: Record<KeyedProvider, { key: string; model: string }> = {
  openai: { key: "OPENAI_API_KEY", model: "OPENAI_MODEL" },
  gemini: { key: "GEMINI_API_KEY", model: "GEMINI_MODEL" },
};

function statusOf(
  environment: Environment,
  names: { key: string; model: string },
): ProviderStatus {
  // A chave é lida só para saber se existe: nenhum pedaço dela, nem o
  // tamanho, entra no resultado.
  const configured = (environment[names.key] ?? "").trim().length > 0;
  const model = (environment[names.model] ?? "").trim();
  return { configured, model: model === "" ? null : model };
}

/**
 * Diz quais provedores de IA têm chave no servidor, sem expor a chave.
 * O ambiente é lido a cada chamada, então reflete o processo em execução.
 */
export function readProviderStatus(
  environment: Environment = process.env,
): ProviderStatusResponse {
  return {
    providers: {
      openai: statusOf(environment, VARIABLES.openai),
      gemini: statusOf(environment, VARIABLES.gemini),
    },
  };
}
