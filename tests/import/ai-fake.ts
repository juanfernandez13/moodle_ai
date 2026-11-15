// Auxiliares dos testes de IA: todas as IAs da aplicação falam o formato chat/completions, então a resposta simulada e
// a leitura do pedido são as mesmas para OpenAI, Gemini, Claude e "Outra IA".

/** Uma resposta de chat/completions com este texto. */
export function chatReply(
  text: string,
  extra: { finishReason?: string; refusal?: string } = {},
): Response {
  return Response.json({
    id: "chatcmpl-teste",
    object: "chat.completion",
    choices: [
      {
        index: 0,
        finish_reason: extra.finishReason ?? "stop",
        message: {
          role: "assistant",
          content: text,
          ...(extra.refusal !== undefined ? { refusal: extra.refusal } : {}),
        },
      },
    ],
  });
}

export interface ChatRequest {
  model: string;
  messages: { role: string; content: unknown }[];
  response_format?: { type: string };
  max_tokens?: number;
  max_completion_tokens?: number;
}
/** O corpo do pedido que a aplicação mandou para a IA. */
export function chatRequest(options: RequestInit | undefined): ChatRequest {
  return JSON.parse(String(options?.body)) as ChatRequest;
}
/** O prompt de sistema (as instruções) que a IA recebeu. */
export function sentPrompt(options: RequestInit | undefined): string {
  return String(chatRequest(options).messages[0]!.content);
}
