import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import JSZip from "jszip";
import {
  extractDocument,
  importDocuments,
  type ImportProvenance,
} from "../../src/server/import/index.ts";
import { hash256 } from "../../src/shared/archive.ts";

const PNG = await readFile(
  new URL("../fixtures/import/figure.png", import.meta.url),
);
const RELATIONS =
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/figure.png"/></Relationships>';
async function docx(
  fixture: string,
  relations = RELATIONS,
  media = true,
): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    "word/document.xml",
    await readFile(new URL(`../fixtures/import/${fixture}`, import.meta.url)),
  );
  zip.file(
    "[Content_Types].xml",
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>',
  );
  zip.file("word/_rels/document.xml.rels", relations);
  if (media) zip.file("word/media/figure.png", PNG);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
const input = (bytes: Uint8Array, name = "planejamento.docx") => ({
  id: "fixture",
  name,
  mediaType:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  bytes,
});

test("DOCX preserva a ordem de três ocorrências, tabela e imagem da questão com bytes deduplicados", async () => {
  const bytes = await docx("topics-images.xml");
  const result = await importDocuments({
    files: [input(bytes)],
    profile: "docx-topicos-v1",
    provider: "offline",
  });
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  if (!result.ok) return;
  assert.equal(result.assets.length, 1);
  assert.equal(
    await hash256(Buffer.from(result.assets[0]!.base64, "base64")),
    await hash256(PNG),
  );
  assert.equal(
    result.sources[0]!.base64,
    Buffer.from(bytes).toString("base64"),
  );
  const section = result.draft.sections[0]!;
  assert.deepEqual(
    section.summaryBlocks?.map((block) => block.kind),
    ["text", "image", "text", "table"],
  );
  const table = section.summaryBlocks?.find((block) => block.kind === "table");
  assert.equal(table?.kind, "table");
  if (table?.kind === "table")
    assert.equal(table.rows[1]?.[1]?.blocks[0]?.kind, "image");
  const quiz = section.activities[0];
  assert.equal(quiz?.type, "quiz");
  if (quiz?.type === "quiz")
    assert.deepEqual(
      quiz.questions[0]?.statementBlocks?.map((block) => block.kind),
      ["text", "image"],
    );
  assert.equal(result.draft.attachments[0]?.size, PNG.byteLength);
});

test("segunda estrutura DOCX usa metadados em tabela e organização semanal", async () => {
  const result = await importDocuments({
    files: [input(await docx("weeks-table.xml", "<Relationships/>", false))],
    profile: "docx-semanal-v1",
    provider: "offline",
  });
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  if (!result.ok) return;
  assert.equal(result.draft.metadata.fullName, "Oficina semanal");
  assert.equal(result.draft.metadata.shortName, "OFS-02");
  assert.equal(result.draft.metadata.organization, "weeks");
  assert.deepEqual(
    result.draft.sections.map((section) => section.title),
    ["Conversa inicial", "Prática"],
  );
});

test("origem de metadados em tabela aponta para o bloco efetivamente mostrado na prévia", async () => {
  const result = await importDocuments({
    files: [input(await docx("weeks-table.xml", "<Relationships/>", false))],
    profile: "docx-semanal-v1",
    provider: "offline",
  });
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  if (!result.ok) return;
  const preview = result.preview[0]!;
  const table = preview.blocks.find((block) => block.kind === "table");
  assert.ok(table);
  for (const path of ["metadata.fullName", "metadata.shortName"]) {
    const origins: ImportProvenance["fields"] = result.provenance.fields.filter(
      (field) => field.path === path,
    );
    assert.equal(origins.length, 1);
    assert.equal(origins[0]?.sourceId, preview.sourceId);
    assert.equal(origins[0]?.blockId, table.id);
  }
  const sourceIds = new Set(
    preview.blocks.flatMap((block) =>
      block.kind === "table"
        ? [
            block.id,
            ...block.rows.flatMap((row) =>
              row.flatMap((cell) => cell.blocks.map((part) => part.id)),
            ),
          ]
        : [block.id],
    ),
  );
  assert.ok(
    result.provenance.fields.every(
      (field) =>
        field.sourceId === preview.sourceId && sourceIds.has(field.blockId),
    ),
  );
});

test("imagem ausente e imagem externa bloqueiam sem acesso à URL", async () => {
  const missing = await importDocuments({
    files: [input(await docx("topics-images.xml", RELATIONS, false))],
    profile: "docx-topicos-v1",
    provider: "offline",
  });
  assert.equal(missing.ok, false);
  assert.ok(missing.issues.some((issue) => issue.code === "missing_image"));
  const external = await importDocuments({
    files: [
      input(
        await docx(
          "topics-images.xml",
          RELATIONS.replace(
            'Target="media/figure.png"',
            'Target="https://private.invalid/SECRET" TargetMode="External"',
          ),
          false,
        ),
      ),
    ],
    profile: "docx-topicos-v1",
    provider: "offline",
  });
  assert.equal(external.ok, false);
  assert.ok(external.issues.some((issue) => issue.code === "external_image"));
  assert.equal(JSON.stringify(external.issues).includes("SECRET"), false);
});

test("arquivo inválido, XML malformado e UTF-8 inválido recebem diagnóstico controlado", async () => {
  const invalid = await importDocuments({
    files: [input(new TextEncoder().encode("SECRET"))],
    profile: "docx-topicos-v1",
    provider: "offline",
  });
  assert.equal(invalid.ok, false);
  assert.equal(JSON.stringify(invalid).includes("SECRET"), false);
  const zip = new JSZip();
  zip.file("word/document.xml", "<w:document><w:body></w:document>");
  const malformed = await importDocuments({
    files: [input(await zip.generateAsync({ type: "uint8array" }))],
    profile: "docx-topicos-v1",
    provider: "offline",
  });
  assert.equal(malformed.ok, false);
  assert.ok(
    malformed.issues.some((issue) => issue.code === "invalid_document"),
  );
  await assert.rejects(
    extractDocument(input(new Uint8Array([0xff]), "dados.txt")),
    { code: "invalid_text_encoding" },
  );
});
