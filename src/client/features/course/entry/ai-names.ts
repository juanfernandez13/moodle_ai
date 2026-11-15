import {
  AI_PRESETS,
  AI_PROVIDER_IDS,
} from "../../../../shared/ai-providers.ts";
import type { AiProvider } from "../hooks/use-course-import.ts";

export const AI_NAME = Object.fromEntries(
  AI_PROVIDER_IDS.map((id) => [id, AI_PRESETS[id].label]),
) as Record<AiProvider, string>;
/** Ordem das IAs no select, na janelinha e na escolha do padrão: Gemini primeiro, a Outra IA por último. */
export const AI_ORDER: readonly AiProvider[] = AI_PROVIDER_IDS;
