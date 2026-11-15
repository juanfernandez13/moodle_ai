import { z } from "zod";
import { AI_PROVIDER_IDS } from "../../../../src/shared/ai-providers.ts";
import { BodyError, readJsonBody } from "../../../../src/shared/http.ts";
import { testConnection } from "../../../../src/server/import/connection-test.ts";
import { checkImportRequestPolicy } from "../../../../src/server/import/request-policy.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// O "Testar" da janela da IA. Mesma defesa da importação (mesma origem, JSON), e o mesmo cuidado com o endereço digitado.
const bodySchema = z.strictObject({
  provider: z.enum(AI_PROVIDER_IDS),
  apiKey: z.string().max(2000).optional(),
  model: z.string().min(1).max(200).optional(),
  baseUrl: z.string().min(1).max(500).optional(),
});
const headers = {
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};
const invalid = (message: string, path = "$", status = 400): Response =>
  Response.json(
    {
      ok: false,
      issues: [{ code: "invalid_test_input", path, severity: "error", message }],
    },
    { status, headers },
  );

export async function POST(request: Request): Promise<Response> {
  try {
    const rejected = checkImportRequestPolicy(request, "json");
    if (rejected) return rejected;
    const parsed = bodySchema.safeParse(await readJsonBody(request, 16 * 1024));
    if (!parsed.success)
      return invalid("Confira a IA, a chave, o modelo e o endereço.");
    const { provider, apiKey, model, baseUrl } = parsed.data;
    if (baseUrl !== undefined && provider !== "custom")
      return invalid("O endereço só vale para a Outra IA.", "baseUrl");
    const result = await testConnection(provider, {
      ...(apiKey !== undefined ? { apiKey } : {}),
      ...(model !== undefined ? { model } : {}),
      ...(baseUrl !== undefined ? { baseUrl } : {}),
      signal: request.signal,
    });
    // O resultado do teste (inclusive "a chave não vale") é uma resposta normal: o 200 diz que o teste rodou.
    return Response.json(result, { status: 200, headers });
  } catch (error) {
    if (error instanceof BodyError)
      return invalid(
        error.message,
        "$",
        error.code === "request_too_large" ? 413 : 400,
      );
    return invalid("Não foi possível ler o pedido de teste.");
  }
}
