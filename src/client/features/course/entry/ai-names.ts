import type { AiProvider } from "../hooks/use-course-import.ts";

export const AI_NAME: Record<AiProvider, string> = {
  gemini: "Gemini",
  openai: "OpenAI",
};
/** Ordem das IAs no select, na janelinha e na escolha do padrão: Gemini primeiro. */
export const AI_ORDER: readonly AiProvider[] = ["gemini", "openai"];
