import { readFormBody, BodyError } from "../../../../src/shared/http.ts";
import {
  studentMappingSchema,
  type StudentMapping,
} from "../../../../src/domain/students/index.ts";
import { parseStudentFile } from "../../../../src/server/students/files.ts";
export const runtime = "nodejs";
export async function POST(request: Request): Promise<Response> {
  try {
    const form = await readFormBody(request, 9 * 1024 * 1024);
    const file = form.get("file");
    if (!(file instanceof File))
      return Response.json(
        {
          ok: false,
          issues: [
            { code: "missing_file", message: "Selecione uma planilha." },
          ],
        },
        { status: 422 },
      );
    let mapping: StudentMapping | undefined;
    if (form.has("mapping")) {
      const parsed = studentMappingSchema.safeParse(
        JSON.parse(String(form.get("mapping"))),
      );
      if (!parsed.success)
        return Response.json(
          {
            ok: false,
            issues: [
              {
                code: "invalid_mapping",
                message: "Confira o mapeamento de colunas.",
              },
            ],
          },
          { status: 422 },
        );
      mapping = {
        header: parsed.data.header,
        columns: Object.fromEntries(
          Object.entries(parsed.data.columns).filter(
            ([, value]) => value !== undefined,
          ),
        ),
      };
    }
    const sheet = form.get("sheet");
    const result = await parseStudentFile({
      name: file.name,
      bytes: new Uint8Array(await file.arrayBuffer()),
      ...(typeof sheet === "string" ? { sheet } : {}),
      ...(mapping ? { mapping } : {}),
    });
    return Response.json(result, { status: result.ok ? 200 : 422 });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        issues: [
          {
            code: error instanceof BodyError ? error.code : "invalid_file",
            message:
              error instanceof BodyError
                ? error.message
                : "Não foi possível ler a planilha ou o mapeamento.",
          },
        ],
      },
      { status: 422 },
    );
  }
}
