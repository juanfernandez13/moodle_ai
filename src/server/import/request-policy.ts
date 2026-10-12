import { hasSameOrigin } from '../../shared/request-origin.ts';

function reject(code: string, message: string, status: number): Response {
  return Response.json(
    { ok: false, issues: [{ code, path: "$", severity: "error", message }] },
    {
      status,
      headers: {
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    },
  );
}

// Reject before reading a body or looking up server provider credentials.
// CLI callers must send the same explicit Origin as the local application.
export function checkImportRequestPolicy(
  request: Request,
  format: "json" | "multipart",
): Response | null {
  if (!hasSameOrigin(request))
    return reject(
      "invalid_origin",
      "Abra a aplicação e envie a solicitação a partir da mesma origem.",
      403,
    );
  const mediaType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  const expected =
    format === "json" ? "application/json" : "multipart/form-data";
  if (mediaType !== expected)
    return reject(
      "unsupported_content_type",
      format === "json"
        ? "Envie o texto usando application/json."
        : "Envie os documentos usando multipart/form-data.",
      415,
    );
  return null;
}
