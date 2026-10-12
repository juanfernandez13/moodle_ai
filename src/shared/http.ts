export class BodyError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "BodyError";
    this.code = code;
  }
}
export async function readBody(
  request: Request,
  maximum: number,
): Promise<Uint8Array> {
  if (!Number.isSafeInteger(maximum) || maximum <= 0)
    throw new Error("Limite de corpo inválido.");
  const declared = request.headers.get("content-length");
  if (
    declared !== null &&
    (!/^\d+$/.test(declared) || Number(declared) > maximum)
  )
    throw new BodyError(
      "request_too_large",
      "A solicitação excede o tamanho permitido.",
    );
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      if (request.signal.aborted)
        throw new BodyError("cancelled", "A solicitação foi cancelada.");
      const next = await reader.read();
      if (next.done) break;
      total += next.value.byteLength;
      if (total > maximum) {
        await reader.cancel();
        throw new BodyError(
          "request_too_large",
          "A solicitação excede o tamanho permitido.",
        );
      }
      chunks.push(next.value);
    }
  } catch (error) {
    if (error instanceof BodyError) throw error;
    throw new BodyError(
      "invalid_body",
      "Não foi possível ler o corpo da solicitação.",
    );
  } finally {
    reader.releaseLock();
  }
  const output = new Uint8Array(total);
  let position = 0;
  for (const chunk of chunks) {
    output.set(chunk, position);
    position += chunk.byteLength;
  }
  return output;
}
export async function readJsonBody(
  request: Request,
  maximum: number,
): Promise<unknown> {
  const bytes = await readBody(request, maximum);
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new BodyError(
      "invalid_json",
      "O corpo da solicitação deve ser JSON válido.",
    );
  }
}
export async function readFormBody(
  request: Request,
  maximum: number,
): Promise<FormData> {
  const bytes = await readBody(request, maximum);
  try {
    return await new Request(request.url, {
      method: "POST",
      headers: { "content-type": request.headers.get("content-type") ?? "" },
      body: new Uint8Array(bytes).buffer,
    }).formData();
  } catch {
    throw new BodyError(
      "invalid_form",
      "A solicitação deve conter um formulário multipart válido.",
    );
  }
}
