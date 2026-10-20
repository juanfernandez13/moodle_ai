import {
  exportCourse,
  EXPORT_LIMITS,
  PROFILE_VALIDATION,
} from "../../../src/server/export/index.ts";
import {
  validateDraft,
  type ValidationIssue,
} from "../../../src/domain/course/index.ts";
import { BodyError, readFormBody } from "../../../src/shared/http.ts";

export const runtime = "nodejs";
const BODY_LIMIT = EXPORT_LIMITS.attachmentBytes + 5 * 1024 * 1024;
const responseIssue = (code: string, path: string, message: string): Response =>
  Response.json(
    {
      issues: [
        { code, path, severity: "error", message } satisfies ValidationIssue,
      ],
    },
    { status: 422 },
  );

export async function POST(request: Request): Promise<Response> {
  try {
    const form = await readFormBody(request, BODY_LIMIT);
    const drafts = form.getAll("draft");
    if (
      drafts.length !== 1 ||
      typeof drafts[0] !== "string" ||
      Buffer.byteLength(drafts[0], "utf8") > 4 * 1024 * 1024
    )
      return responseIssue(
        "invalid_draft_transport",
        "draft",
        "Envie um único rascunho JSON de até 4 MB.",
      );
    let raw: unknown;
    try {
      raw = JSON.parse(drafts[0]);
    } catch {
      return responseIssue(
        "invalid_json",
        "draft",
        "O rascunho precisa ser um JSON válido.",
      );
    }
    const validation = validateDraft(raw);
    if (!validation.valid)
      return Response.json({ issues: validation.issues }, { status: 422 });
    const declared = new Set(validation.draft.attachments.map((ref) => ref.id));
    const files = new Map<string, File>();
    for (const [key, value] of form) {
      if (key === "draft") continue;
      if (
        !key.startsWith("file:") ||
        !declared.has(key.slice(5)) ||
        typeof value === "string" ||
        files.has(key.slice(5))
      )
        return responseIssue(
          "invalid_attachment_transport",
          "attachments",
          "Envie cada anexo declarado uma vez, usando file:<id>.",
        );
      if (value.size > EXPORT_LIMITS.fileBytes)
        return responseIssue(
          "attachment_too_large",
          "attachments",
          "Cada anexo pode ter no máximo 16 MB.",
        );
      files.set(key.slice(5), value);
    }
    const result = await exportCourse(validation.draft, {
      profileId: "moodle-4.1-core-v1",
      signal: request.signal,
      resolveAttachment: async (id) => {
        const file = files.get(id);
        return file === undefined
          ? null
          : new Uint8Array(await file.arrayBuffer());
      },
    });
    if (!result.ok)
      return Response.json({ issues: result.issues }, { status: 422 });
    const body = new Uint8Array(result.artifact.bytes);
    return new Response(body.buffer, {
      headers: {
        "Content-Type": result.artifact.mediaType,
        "Content-Disposition": `attachment; filename="${result.artifact.filename}"`,
        "Content-Length": String(body.byteLength),
        "X-Content-SHA256": result.artifact.sha256,
        "X-MoodleAI-Revision": String(result.revision),
        "X-MoodleAI-Compatibility": PROFILE_VALIDATION.status,
        "X-MoodleAI-Lab-Release": PROFILE_VALIDATION.release,
        "X-MoodleAI-Lab-Build": PROFILE_VALIDATION.build,
        "X-MoodleAI-Glossary-Userinfo": result.warnings.some(
          (warning) => warning.code === "glossary_restore_setting",
        )
          ? "required"
          : "not-required",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof BodyError)
      return responseIssue(error.code, "$", error.message);
    return responseIssue(
      "export_request_failed",
      "$",
      "Não foi possível ler a requisição de exportação. Confira os arquivos e tente novamente.",
    );
  }
}
