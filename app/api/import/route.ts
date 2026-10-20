import {
  importDocuments,
  IMPORT_LIMITS,
} from "../../../src/server/import/index.ts";
import { BodyError, readFormBody } from "../../../src/shared/http.ts";
import { UPLOAD_MESSAGES } from "../../../src/shared/upload-limits.ts";
import { checkImportRequestPolicy } from "../../../src/server/import/request-policy.ts";

export const runtime = "nodejs";
// Boundaries and headers of up to maxFiles parts, on top of the documents.
const BODY_OVERHEAD_BYTES = 64 * 1024;
const fail = (code: string, message: string, status = 422): Response =>
  Response.json(
    { ok: false, issues: [{ code, path: "$", severity: "error", message }] },
    { status, headers: { "cache-control": "no-store" } },
  );

export async function POST(request: Request): Promise<Response> {
  try {
    const rejected = checkImportRequestPolicy(request, "multipart");
    if (rejected) return rejected;
    const form = await readFormBody(
      request,
      IMPORT_LIMITS.maxTotalBytes + BODY_OVERHEAD_BYTES,
    );
    const allowed = new Set([
      "files",
      "profile",
      "provider",
      "apiKey",
      "model",
    ]);
    if ([...form.keys()].some((key) => !allowed.has(key)))
      return fail(
        "unknown_field",
        "O formulário contém um campo que não pertence à importação.",
      );
    const entries = form.getAll("files");
    if (
      !entries.length ||
      entries.length > IMPORT_LIMITS.maxFiles ||
      entries.some((entry) => typeof entry === "string")
    )
      return fail("invalid_import_files", UPLOAD_MESSAGES.fileCount);
    const options: Record<string, unknown> = {};
    for (const key of ["profile", "provider", "apiKey", "model"]) {
      const values = form.getAll(key);
      if (
        values.length > 1 ||
        values.some((value) => typeof value !== "string")
      )
        return fail(
          "invalid_import_input",
          "Envie cada configuração da importação uma única vez.",
        );
      if (values[0] !== undefined) options[key] = values[0];
    }
    const files = [];
    for (let index = 0; index < entries.length; index++) {
      const file = entries[index]!;
      if (typeof file === "string")
        return fail(
          "invalid_import_files",
          "Envie os documentos como arquivos.",
        );
      if (file.size > IMPORT_LIMITS.maxFileBytes)
        return fail("file_size_limit", UPLOAD_MESSAGES.fileSize, 413);
      files.push({
        id: `source-${index + 1}`,
        name: file.name,
        mediaType: file.type,
        bytes: new Uint8Array(await file.arrayBuffer()),
      });
    }
    const result = await importDocuments(
      { ...options, files },
      { signal: request.signal },
    );
    return Response.json(result, {
      status: result.ok ? 200 : 422,
      headers: {
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof BodyError) {
      const tooLarge = error.code === "request_too_large";
      return fail(
        error.code,
        tooLarge ? UPLOAD_MESSAGES.totalSize : error.message,
        tooLarge ? 413 : 400,
      );
    }
    return fail(
      "import_request_failed",
      "Não foi possível ler a importação. Confira os arquivos e tente novamente.",
    );
  }
}
