import { AI_PRESETS, type AiPreset } from "../../shared/ai-providers.ts";
import { checkBaseUrl } from "./base-url.ts";
import {
  ImportError,
  type ImportDependencies,
  type ImportProvider,
} from "./types.ts";

/** Para onde, com que chave e com que modelo uma chamada de IA vai. É a mesma conta para importar e para testar. */
export interface Endpoint {
  preset: AiPreset;
  apiKey: string;
  model: string;
  /** O endereço completo de chat/completions. */
  url: string;
}

export function resolveEndpoint(
  provider: Exclude<ImportProvider, "offline">,
  dependencies: Pick<ImportDependencies, "apiKey" | "model" | "baseUrl">,
): Endpoint {
  const preset = AI_PRESETS[provider];
  const apiKey = (
    dependencies.apiKey ??
    process.env[preset.keyVariable] ??
    ""
  ).trim();
  if (!apiKey)
    throw new ImportError(
      "provider_unconfigured",
      `Configure uma chave ${preset.label} nesta sessão ou ${preset.keyVariable} no servidor. Você também pode criar a disciplina manualmente.`,
    );
  // Mesma leitura do GET /api/import/providers: linha em branco no ambiente vale como "sem modelo".
  const environmentModel = process.env[preset.modelVariable]?.trim();
  const model =
    dependencies.model ?? (environmentModel || preset.defaultModel || "");
  if (!model)
    throw new ImportError("invalid_model", "Informe o modelo desta IA.");
  if (!/^[A-Za-z0-9][A-Za-z0-9._:/@-]{0,199}$/.test(model))
    throw new ImportError(
      "invalid_model",
      "Informe um identificador de modelo válido.",
    );
  // As IAs conhecidas têm o endereço delas. Só a "Outra IA" usa o digitado: o do servidor vale sem conferência
  // (quem o escreveu administra o servidor); o da tela passa pela conferência de endereço.
  let baseUrl = preset.baseUrl;
  if (baseUrl === null) {
    const environmentUrl = preset.baseUrlVariable
      ? process.env[preset.baseUrlVariable]?.trim()
      : undefined;
    const typed = dependencies.baseUrl?.trim();
    const raw = typed || environmentUrl;
    if (!raw)
      throw new ImportError(
        "invalid_base_url",
        "Informe o endereço da IA. Exemplo: https://openrouter.ai/api/v1",
      );
    if (typed) {
      const checked = checkBaseUrl(typed);
      if (!checked.ok)
        throw new ImportError("invalid_base_url", checked.message);
      baseUrl = checked.url;
    } else baseUrl = raw;
  }
  return {
    preset,
    apiKey,
    model,
    url: `${baseUrl.replace(/\/+$/, "")}/chat/completions`,
  };
}
