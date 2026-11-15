import { AI_PRESETS, AI_PROVIDER_IDS } from "../../shared/ai-providers.ts";
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
 * Os nomes das variáveis são os mesmos que src/server/import/providers.ts consulta ao interpretar
 * (todos saem de src/shared/ai-providers.ts).
 */
export function readProviderStatus(
  environment: Environment = process.env,
): ProviderStatusResponse {
  const providers = {} as Record<KeyedProvider, ProviderStatus>;
  for (const id of AI_PROVIDER_IDS) {
    const preset = AI_PRESETS[id];
    providers[id] = statusOf(environment, {
      key: preset.keyVariable,
      model: preset.modelVariable,
    });
  }
  return { providers };
}
