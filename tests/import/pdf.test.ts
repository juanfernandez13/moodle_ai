import assert from "node:assert/strict";
import test from "node:test";
import { importDocuments } from "../../src/server/import/index.ts";

function pdf(lines: string[], image = false): Uint8Array {
  const literal = (line: string) => line.replace(/([\\()])/g, "\\$1");
  const content = `BT /F1 12 Tf 50 750 Td 18 TL ${lines.map((line) => `(${literal(line)}) Tj T*`).join(" ")} ET${image ? " q 20 0 0 20 50 500 cm /Im1 Do Q" : ""}`;
  const entries = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >>${image ? " /XObject << /Im1 6 0 R >>" : ""} >> /Contents 5 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content, "ascii")} >>\nstream\n${content}\nendstream`,
    ...(image
      ? [
          "<< /Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length 3 >>\nstream\nRGB\nendstream",
        ]
      : []),
  ];
  let value = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 0; index < entries.length; index++) {
    offsets.push(Buffer.byteLength(value, "ascii"));
    value += `${index + 1} 0 obj\n${entries[index]}\nendobj\n`;
  }
  const start = Buffer.byteLength(value, "ascii");
  value += `xref\n0 ${entries.length + 1}\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join(
      "",
    )}trailer\n<< /Size ${entries.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return Buffer.from(value, "ascii");
}
const input = (bytes: Uint8Array) => ({
  files: [
    {
      id: "pdf-source",
      name: "planejamento.pdf",
      mediaType: "application/pdf",
      bytes,
    },
  ],
  profile: "docx-topicos-v1",
  provider: "offline",
});
const lines = [
  "Disciplina: Curso PDF",
  "Codigo: PDF-01",
  "Topico 1: Leitura",
  "Leia este planejamento ficticio.",
];

test("PDF com texto selecionável conserva fonte e gera proposta com aviso de leitura", async () => {
  const bytes = pdf(lines),
    result = await importDocuments(input(bytes));
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  if (!result.ok) return;
  assert.equal(result.draft.metadata.fullName, "Curso PDF");
  assert.equal(result.draft.sections[0]?.title, "Leitura");
  assert.deepEqual(
    Buffer.from(result.sources[0]!.base64, "base64"),
    Buffer.from(bytes),
  );
  assert.ok(
    result.issues.some(
      (issue) =>
        issue.code === "pdf_reading_order" && issue.severity === "warning",
    ),
  );
});

test("PDF escaneado e PDF com figuras exigem diagnóstico", async () => {
  const scanned = await importDocuments(input(pdf([], true)));
  assert.equal(scanned.ok, false);
  assert.ok(scanned.issues.some((issue) => issue.code === "scanned_pdf"));
  const illustrated = await importDocuments(input(pdf(lines, true)));
  assert.equal(illustrated.ok, false);
  assert.ok(
    illustrated.issues.some((issue) => issue.code === "pdf_image_review"),
  );
  assert.ok(illustrated.preview?.[0]?.blocks.length);
});
