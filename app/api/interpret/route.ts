import { interpretText } from "../../../src/server/import/index.ts";
import { BodyError, readJsonBody } from "../../../src/shared/http.ts";
import { checkImportRequestPolicy } from "../../../src/server/import/request-policy.ts";

export const runtime = "nodejs";
export async function POST(request: Request): Promise<Response> {
  try {
    const rejected = checkImportRequestPolicy(request, "json");
    if (rejected) return rejected;
    const input = await readJsonBody(request, 2 * 1024 * 1024);
    const result = await interpretText(input, { signal: request.signal });
    return Response.json(result, {
      status: result.ok ? 200 : 422,
      headers: {
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    const problem =
      error instanceof BodyError
        ? { code: error.code, message: error.message }
        : {
            code: "interpret_request_failed",
            message:
              "Não foi possível ler o texto. Confira a entrada e tente novamente.",
          };
    return Response.json(
      { ok: false, issues: [{ ...problem, path: "$", severity: "error" }] },
      {
        status: problem.code === "request_too_large" ? 413 : 400,
        headers: { "cache-control": "no-store" },
      },
    );
  }
}
