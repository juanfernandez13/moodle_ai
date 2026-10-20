import { readProviderStatus } from "../../../../src/server/import/provider-status.ts";

export const runtime = "nodejs";
// O ambiente é lido a cada chamada; a resposta nunca pode ser fixada no build.
export const dynamic = "force-dynamic";

/**
 * Informa se o servidor tem chave de IA configurada e qual modelo usa, sem
 * nunca devolver, registrar ou repetir a chave.
 *
 * Não exige Origin: o navegador não envia esse cabeçalho em GET da mesma
 * origem (as rotas GET do Moodle seguem a mesma regra), então a verificação
 * recusaria a própria aplicação. A resposta só tem sim/não e o nome do
 * modelo, e sem cabeçalhos CORS outro site não consegue lê-la. As rotas que
 * de fato usam a chave (POST) continuam exigindo a origem da aplicação.
 */
export function GET(): Response {
  return Response.json(readProviderStatus(), {
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
