/**
 * As IAs que a aplicação sabe chamar. Todas falam o mesmo formato (POST {endereço}/chat/completions, com a chave em
 * "Authorization: Bearer"); o que muda de uma para outra cabe nestas predefinições: endereço, modelo padrão, o nome do
 * parâmetro do limite de saída e se o serviço aceita o modo JSON. Servidor e tela leem a mesma tabela.
 */

export const AI_PROVIDER_IDS = ["gemini", "openai", "claude", "custom"] as const;
export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];

export interface AiPreset {
  id: AiProviderId;
  /** Nome na tela. */
  label: string;
  /** Endereço base do serviço; null quando quem usa informa (a IA "Outra"). */
  baseUrl: string | null;
  /** Modelo usado quando a pessoa e o servidor não escolhem outro; null quando não há como adivinhar. */
  defaultModel: string | null;
  /** Modelos conhecidos, só como sugestão: o campo aceita qualquer nome. */
  suggestions: readonly string[];
  /** Os serviços não concordam no nome deste parâmetro: o da OpenAI mudou, os demais ficaram no antigo. */
  tokenParam: "max_tokens" | "max_completion_tokens";
  /**
   * json_object: pede resposta em JSON (OpenAI, Gemini e a maioria). none: o serviço recusa esse pedido (o Claude no
   * formato compatível só aceita json_schema estrito, e responde 400 a json_object), então vale o prompt.
   */
  jsonMode: "json_object" | "none";
  /** A página onde a pessoa gera a chave (o "Onde pego a chave?" da janela); null quando não há uma só. */
  keyUrl: string | null;
  /** Variáveis de ambiente do servidor (a chave nunca vai para o navegador). */
  keyVariable: string;
  modelVariable: string;
  baseUrlVariable: string | null;
}

export const AI_PRESETS: Readonly<Record<AiProviderId, AiPreset>> = {
  gemini: {
    id: "gemini",
    label: "Gemini",
    // O Gemini aceita o formato OpenAI neste endereço (documentação do Google).
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    // O foco do projeto: o 3.5 Flash. Os outros são alternativas da documentação do Google (nov/2026).
    defaultModel: "gemini-3.5-flash",
    suggestions: [
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.8-flash",
      "gemini-4-hydrogen",
      "gemini-4-argon",
    ],
    tokenParam: "max_tokens",
    jsonMode: "json_object",
    keyUrl: "https://aistudio.google.com/apikey",
    keyVariable: "GEMINI_API_KEY",
    modelVariable: "GEMINI_MODEL",
    baseUrlVariable: null,
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    // A página oficial dos modelos confirma o chat/completions no gpt-6-luna (o mais barato); os outros ficam como opção.
    defaultModel: "gpt-6-luna",
    suggestions: ["gpt-6-luna", "gpt-6.1-terra", "gpt-6.1-sol", "gpt-6-astra"],
    tokenParam: "max_completion_tokens",
    jsonMode: "json_object",
    keyUrl: "https://platform.openai.com/api-keys",
    keyVariable: "OPENAI_API_KEY",
    modelVariable: "OPENAI_MODEL",
    baseUrlVariable: null,
  },
  claude: {
    id: "claude",
    label: "Claude",
    // Camada de compatibilidade da Anthropic com o formato OpenAI (documentação da Anthropic).
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-sonnet-5-5",
    suggestions: [
      "claude-sonnet-5-5",
      "claude-opus-5-5",
      "claude-haiku-5-5",
      "claude-fable-5-2",
    ],
    tokenParam: "max_tokens",
    jsonMode: "none",
    keyUrl: "https://platform.claude.com/settings/keys",
    keyVariable: "ANTHROPIC_API_KEY",
    modelVariable: "ANTHROPIC_MODEL",
    baseUrlVariable: null,
  },
  custom: {
    id: "custom",
    label: "Outra IA",
    baseUrl: null,
    defaultModel: null,
    suggestions: [],
    tokenParam: "max_tokens",
    jsonMode: "json_object",
    keyUrl: null,
    keyVariable: "CUSTOM_AI_API_KEY",
    modelVariable: "CUSTOM_AI_MODEL",
    baseUrlVariable: "CUSTOM_AI_BASE_URL",
  },
};
