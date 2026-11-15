import { resolveEndpoint } from "./endpoint.ts";
import {
  ImportError,
  type ImportDependencies,
  type ImportProvider,
} from "./types.ts";

/**
 * O "Testar" da janela da IA: uma chamada mínima de verdade, pelo mesmo caminho da importação (mesmo endereço, mesma
 * chave, mesmo modelo). Prova de uma vez que a chave vale, que o modelo existe e que o serviço fala chat/completions.
 * Custa uma frase curta de resposta. Nada do que o serviço responde volta para a tela, só a explicação daqui.
 */
export type ConnectionResult =
  | { ok: true; model: string; message: string; reply: string; ms: number }
  | { ok: false; code: string; message: string };

const TEST_TIMEOUT_MS = 25_000;
// A pergunta é curta de propósito. O limite de saída tem folga porque os modelos que "pensam" gastam parte dele antes
// de responder; para o teste basta o serviço aceitar o pedido (200).
const TEST_PROMPT = "Responda apenas com a palavra: ok";
const TEST_MAX_TOKENS = 256;

type Failure = Extract<ConnectionResult, { ok: false }>;
const fail = (code: string, message: string): Failure => ({
  ok: false,
  code,
  message,
});

/** Lê só o começo do corpo de um erro, só para entender o motivo: ele nunca é devolvido. */
async function peek(response: Response): Promise<string> {
  try {
    const reader = response.body?.getReader();
    if (!reader) return "";
    const decoder = new TextDecoder();
    let text = "";
    while (text.length < 8192) {
      const { value, done } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
    }
    await reader.cancel().catch(() => undefined);
    return text.slice(0, 8192);
  } catch {
    return "";
  }
}

/** Em português simples: o que aconteceu e o que fazer. */
export function explainFailure(status: number, body: string): Failure {
  const keyProblem =
    /api[ _-]?key|invalid[ _-]?key|unauthori[sz]ed|authentication|credential/i.test(
      body,
    );
  if (status === 401 || (keyProblem && [400, 403].includes(status)))
    return fail(
      "auth",
      "A chave não foi aceita. Confira se copiou ela inteira, sem espaços.",
    );
  if (status === 403)
    return fail(
      "permission",
      "A chave foi aceita, mas não tem permissão para este modelo.",
    );
  if (status === 402)
    return fail(
      "credit",
      "A conta está sem saldo. Adicione crédito no site do serviço.",
    );
  if (status === 404)
    return fail(
      "model",
      "Não achamos esse modelo (ou o endereço). Escolha outro modelo.",
    );
  if (status === 429)
    return fail(
      "limit",
      "A chave foi aceita, mas o limite de uso (ou o saldo) acabou por agora. Tente mais tarde.",
    );
  if (status >= 500)
    return fail(
      "down",
      "O serviço está fora do ar agora. Tente de novo em instantes.",
    );
  if (/model/i.test(body))
    return fail(
      "model",
      "O serviço não aceitou este modelo. Escolha outro da lista.",
    );
  return fail(
    "rejected",
    "O serviço recusou o teste. Confira o modelo e o endereço.",
  );
}

export async function testConnection(
  provider: Exclude<ImportProvider, "offline">,
  dependencies: Pick<
    ImportDependencies,
    "apiKey" | "model" | "baseUrl" | "fetch" | "signal" | "timeoutMs"
  >,
): Promise<ConnectionResult> {
  let endpoint;
  try {
    endpoint = resolveEndpoint(provider, dependencies);
  } catch (error) {
    if (!(error instanceof ImportError)) throw error;
    return fail(
      error.code,
      error.code === "provider_unconfigured"
        ? "Cole a chave primeiro."
        : error.message,
    );
  }
  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  dependencies.signal?.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(
    () => {
      timedOut = true;
      controller.abort();
    },
    Math.min(dependencies.timeoutMs ?? TEST_TIMEOUT_MS, TEST_TIMEOUT_MS),
  );
  const started = Date.now();
  try {
    if (dependencies.signal?.aborted) return fail("cancelled", "Teste cancelado.");
    const response = await (dependencies.fetch ?? fetch)(endpoint.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${endpoint.apiKey}`,
      },
      body: JSON.stringify({
        model: endpoint.model,
        [endpoint.preset.tokenParam]: TEST_MAX_TOKENS,
        messages: [{ role: "user", content: TEST_PROMPT }],
      }),
      signal: controller.signal,
      redirect: "error",
    });
    if (!response.ok) return explainFailure(response.status, await peek(response));
    let reply = "";
    try {
      const data = JSON.parse((await peek(response)) || "{}") as {
        choices?: { message?: { content?: unknown } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (typeof content === "string") reply = content.trim().slice(0, 80);
    } catch {
      // Um 200 já prova o que o teste quer; a resposta em si é só um detalhe.
    }
    return {
      ok: true,
      model: endpoint.model,
      message: "Funcionou! A IA respondeu.",
      reply,
      ms: Date.now() - started,
    };
  } catch {
    if (timedOut)
      return fail("timeout", "Demorou demais para responder. Tente de novo.");
    if (dependencies.signal?.aborted)
      return fail("cancelled", "Teste cancelado.");
    return fail(
      "network",
      "Não consegui falar com o serviço. Confira a internet e o endereço.",
    );
  } finally {
    clearTimeout(timer);
    dependencies.signal?.removeEventListener("abort", cancel);
  }
}
