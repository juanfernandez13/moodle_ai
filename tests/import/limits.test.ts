import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import JSZip from "jszip";
import { POST as importPost } from "../../app/api/import/route.ts";
import config from "../../next.config.ts";
import { EXPORT_LIMITS } from "../../src/server/export/index.ts";
import {
  IMPORT_LIMITS,
  extractDocument,
  importDocuments,
} from "../../src/server/import/index.ts";
import {
  UPLOAD_LIMITS,
  UPLOAD_MESSAGES,
} from "../../src/shared/upload-limits.ts";

const MiB = 1024 * 1024;
const plan = await readFile(
  new URL("../fixtures/import/topics.txt", import.meta.url),
);
const extraTask = (number: number) =>
  `Tarefa: Tarefa extra ${number}\nNota: 10\nEnvio: file\nDescrição da tarefa ${number}.`;
const textFiles = (count: number): File[] => [
  new File([plan], "planejamento.txt", { type: "text/plain" }),
  ...Array.from(
    { length: count - 1 },
    (_, index) =>
      new File([extraTask(index + 2)], `tarefa-${index + 2}.txt`, {
        type: "text/plain",
      }),
  ),
];
function uploadForm(files: File[]): FormData {
  const form = new FormData();
  for (const file of files) form.append("files", file);
  form.set("profile", "docx-topicos-v1");
  form.set("provider", "offline");
  return form;
}
const uploadRequest = (files: File[]): Request =>
  new Request("http://localhost/api/import", {
    method: "POST",
    headers: { origin: "http://localhost" },
    body: uploadForm(files),
  });
// The whole multipart body as bytes, with no Content-Length header: the route
// has to count what it actually reads.
async function bufferedUploadRequest(files: File[]): Promise<Request> {
  const multipart = new Response(uploadForm(files));
  return new Request("http://localhost/api/import", {
    method: "POST",
    headers: {
      origin: "http://localhost",
      "content-type": multipart.headers.get("content-type")!,
    },
    body: new Uint8Array(await multipart.arrayBuffer()),
  });
}
// A DOCX whose text is one paragraph and whose pictures are the given bytes.
async function docxWithImages(images: Uint8Array[]): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    "word/document.xml",
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Tópico 1: Teste</w:t></w:r></w:p></w:body></w:document>',
  );
  zip.file(
    "[Content_Types].xml",
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>',
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${images
      .map(
        (_, index) =>
          `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/figura-${index + 1}.png"/>`,
      )
      .join("")}</Relationships>`,
  );
  images.forEach((bytes, index) =>
    zip.file(`word/media/figura-${index + 1}.png`, bytes, {
      compression: "STORE",
    }),
  );
  return zip.generateAsync({ type: "uint8array", compression: "STORE" });
}
const docxFile = (id: number, bytes: Uint8Array) => ({
  id: `source-${id}`,
  name: `documento-${id}.docx`,
  mediaType:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  bytes,
});
const issueOf = async (response: Response) =>
  (await response.json()).issues[0] as { code: string; message: string };

test("importação usa os limites de envio e mantém a leitura interna alinhada à exportação", () => {
  assert.equal(IMPORT_LIMITS.maxFiles, 30);
  assert.equal(IMPORT_LIMITS.maxFileBytes, 25 * MiB);
  assert.equal(IMPORT_LIMITS.maxTotalBytes, 80 * MiB);
  assert.equal(IMPORT_LIMITS.maxFiles, UPLOAD_LIMITS.maxFiles);
  assert.equal(IMPORT_LIMITS.maxFileBytes, UPLOAD_LIMITS.maxFileBytes);
  assert.equal(IMPORT_LIMITS.maxTotalBytes, UPLOAD_LIMITS.maxTotalBytes);
  // Uma imagem importada precisa poder ser exportada: estes dois não
  // crescem junto com o envio.
  assert.equal(IMPORT_LIMITS.maxArchiveEntryBytes, EXPORT_LIMITS.fileBytes);
  assert.equal(
    IMPORT_LIMITS.maxArchiveTotalBytes,
    EXPORT_LIMITS.attachmentBytes,
  );
});

test("o limite de corpo do Next acomoda o envio máximo da importação com folga", () => {
  const sizeOf = (value: unknown): number => {
    if (typeof value === "number") return value;
    const match = /^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/i.exec(String(value));
    assert.ok(match, `limite de corpo ilegível: ${String(value)}`);
    const unit = { b: 1, kb: 1024, mb: MiB, gb: 1024 * MiB }[
      match[2]!.toLowerCase() as "b" | "kb" | "mb" | "gb"
    ];
    return Number(match[1]) * unit;
  };
  const limit = sizeOf(config.experimental?.proxyClientMaxBodySize);
  assert.ok(limit >= IMPORT_LIMITS.maxTotalBytes + MiB, `${limit} bytes`);
  assert.ok(limit >= EXPORT_LIMITS.attachmentBytes + 5 * MiB);
});

test("30 arquivos são importados e o 31º é recusado com a mensagem de quantidade", async () => {
  const files = await Promise.all(
    textFiles(IMPORT_LIMITS.maxFiles).map(async (file, index) => ({
      id: `source-${index + 1}`,
      name: file.name,
      mediaType: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
    })),
  );
  const accepted = await importDocuments({
    files,
    profile: "docx-topicos-v1",
    provider: "offline",
  });
  assert.equal(accepted.ok, true, JSON.stringify(accepted.issues));
  if (accepted.ok) assert.equal(accepted.sources.length, 30);
  const refused = await importDocuments({
    files: [
      ...files,
      {
        id: "source-31",
        name: "a-mais.txt",
        mediaType: "text/plain",
        bytes: new Uint8Array([97]),
      },
    ],
    profile: "docx-topicos-v1",
    provider: "offline",
  });
  assert.equal(refused.ok, false);
  assert.deepEqual(
    refused.issues.map((issue) => [issue.code, issue.message]),
    [["invalid_import_input", UPLOAD_MESSAGES.fileCount]],
  );
});

test("documentos que passam de 80 MB juntos são recusados antes de qualquer leitura", async () => {
  const shared = new Uint8Array(20 * MiB + 1);
  const result = await importDocuments({
    files: [1, 2, 3, 4].map((number) => ({
      id: `source-${number}`,
      name: `documento-${number}.pdf`,
      mediaType: "application/pdf",
      bytes: shared,
    })),
    profile: "docx-topicos-v1",
    provider: "offline",
  });
  assert.equal(result.ok, false);
  assert.deepEqual(
    result.issues.map((issue) => [issue.code, issue.message]),
    [["total_upload_limit", UPLOAD_MESSAGES.totalSize]],
  );
});

test("um documento acima de 25 MB é recusado e o tamanho exato passa pela checagem de tamanho", async () => {
  const input = (bytes: Uint8Array) => ({
    id: "source-1",
    name: "grande.txt",
    mediaType: "text/plain",
    bytes,
  });
  await assert.rejects(
    extractDocument(input(new Uint8Array(IMPORT_LIMITS.maxFileBytes + 1))),
    (error: { code?: string; message?: string }) =>
      error.code === "file_size_limit" &&
      error.message === UPLOAD_MESSAGES.fileSize,
  );
  // Com 25 MB exatos a checagem de tamanho passa; este texto tem mais letras
  // do que uma importação permite, então para no limite de conteúdo.
  await assert.rejects(
    extractDocument(
      input(new Uint8Array(IMPORT_LIMITS.maxFileBytes).fill(97)),
    ),
    { code: "document_content_limit" },
  );
});

test("limites do conjunto dizem qual foi quebrado: peso das imagens, quantidade de imagens e texto", async () => {
  const run = async (files: ReturnType<typeof docxFile>[]) => {
    const result = await importDocuments({
      files,
      profile: "docx-topicos-v1",
      provider: "offline",
    });
    assert.equal(result.ok, false);
    return result.issues.map((issue) => [issue.code, issue.message]);
  };
  // Cinco DOCX de uns 13 MB somam uns 65 MB, abaixo dos 80 MB do envio,
  // mas as imagens passam dos 64 MB que a exportação aceita.
  const picture = new Uint8Array(13 * MiB);
  const heavy = await docxWithImages([picture]);
  assert.ok(heavy.length * 5 < IMPORT_LIMITS.maxTotalBytes);
  assert.deepEqual(
    await run([1, 2, 3, 4, 5].map((id) => docxFile(id, heavy))),
    [
      [
        "document_content_limit",
        "As imagens dos documentos juntos passam de 64 MB. Divida a importação.",
      ],
    ],
  );
  // Duas vezes 251 figuras pequenas: 502 imagens, mais que as 500 permitidas.
  const small = await docxWithImages(
    Array.from({ length: 251 }, (_, index) => new Uint8Array([index, 7])),
  );
  assert.deepEqual(await run([1, 2].map((id) => docxFile(id, small))), [
    [
      "document_content_limit",
      "Os documentos juntos têm mais de 500 imagens. Divida a importação.",
    ],
  ]);
  // Dois textos de 200 mil letras: cada um cabe, juntos passam de 300 mil.
  const letters = (id: number) => ({
    id: `source-${id}`,
    name: `texto-${id}.txt`,
    mediaType: "text/plain",
    bytes: new TextEncoder().encode("a".repeat(200_000)),
  });
  assert.deepEqual(await run([letters(1), letters(2)]), [
    [
      "document_content_limit",
      `O texto dos documentos juntos passa de ${(300_000).toLocaleString("pt-BR")} caracteres. Divida a importação.`,
    ],
  ]);
});

test("rota aceita 30 arquivos e recusa o 31º", async () => {
  const accepted = await importPost(uploadRequest(textFiles(30)));
  assert.equal(accepted.status, 200);
  const body = await accepted.json();
  assert.deepEqual(
    body.sources.map((source: { id: string }) => source.id),
    Array.from({ length: 30 }, (_, index) => `source-${index + 1}`),
  );
  const refused = await importPost(uploadRequest(textFiles(31)));
  assert.equal(refused.status, 422);
  assert.deepEqual(await issueOf(refused), {
    code: "invalid_import_files",
    path: "$",
    severity: "error",
    message: UPLOAD_MESSAGES.fileCount,
  });
});

test("rota recusa um documento acima de 25 MB com a mensagem em MB", async () => {
  const response = await importPost(
    uploadRequest([
      new File([new Uint8Array(IMPORT_LIMITS.maxFileBytes + 1)], "grande.pdf", {
        type: "application/pdf",
      }),
    ]),
  );
  assert.equal(response.status, 413);
  const problem = await issueOf(response);
  assert.equal(problem.code, "file_size_limit");
  assert.equal(problem.message, UPLOAD_MESSAGES.fileSize);
});

test("o corpo de exatamente 80 MB em documentos chega à leitura e acima disso é cortado sem Content-Length", async () => {
  const chunk = new Uint8Array(IMPORT_LIMITS.maxTotalBytes / 4);
  const documents = (extra: number) =>
    [1, 2, 3, 4].map(
      (number) =>
        new File(
          [chunk, new Uint8Array(extra)],
          `documento-${number}.docx`,
          { type: "application/octet-stream" },
        ),
    );
  const atLimit = await importPost(await bufferedUploadRequest(documents(0)));
  const codes = ((await atLimit.json()).issues as { code: string }[]).map(
    (issue) => issue.code,
  );
  assert.equal(atLimit.status, 422);
  assert.deepEqual(
    codes.filter((code) =>
      [
        "request_too_large",
        "file_size_limit",
        "total_upload_limit",
        "invalid_import_files",
      ].includes(code),
    ),
    [],
    `o envio no limite não deveria ser recusado por tamanho: ${codes.join()}`,
  );
  const beyond = await importPost(await bufferedUploadRequest(documents(MiB)));
  assert.equal(beyond.status, 413);
  const problem = await issueOf(beyond);
  assert.equal(problem.code, "request_too_large");
  assert.equal(problem.message, UPLOAD_MESSAGES.totalSize);
});
