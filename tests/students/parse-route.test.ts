// POST /api/students/parse: multipart spreadsheet in, mapped rows (or localized issues) out.
import test from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { POST } from "../../app/api/students/parse/route.ts";

function request(fields: Record<string, string | File>): Request {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.set(name, value);
  return new Request("http://localhost/api/students/parse", { method: "POST", body: form });
}
const csv = (text: string, name = "alunos.csv") => new File([text], name, { type: "text/csv" });

test("planilha CSV com cabeçalho devolve linhas mapeadas e a matriz original", async () => {
  const response = await POST(
    request({ file: csv("nome;email;curso\nJoão Silva;joao@example.test;BIO\n") }),
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.sheet, "CSV");
  assert.deepEqual(body.sheetNames, ["CSV"]);
  assert.deepEqual(body.matrix, [
    ["nome", "email", "curso"],
    ["João Silva", "joao@example.test", "BIO"],
  ]);
  assert.deepEqual(
    body.rows.map((row: Record<string, unknown>) => [row.id, row.firstName, row.lastName, row.username, row.course]),
    [["row-2", "João", "Silva", "joao", "BIO"]],
  );
});

test("mapeamento explícito e aba escolhida chegam ao leitor de XLSX", async () => {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([["ignorada"]]), "Capa");
  XLSX.utils.book_append_sheet(
    book,
    XLSX.utils.aoa_to_sheet([["bia@example.test", "Bia Souza"]]),
    "Turma B",
  );
  const bytes = XLSX.write(book, { type: "buffer", bookType: "xlsx" });
  const response = await POST(
    request({
      file: new File([bytes], "turmas.xlsx"),
      sheet: "Turma B",
      mapping: JSON.stringify({ header: false, columns: { email: 0, fullName: 1 } }),
    }),
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.sheet, "Turma B");
  assert.deepEqual(body.sheetNames, ["Capa", "Turma B"]);
  assert.equal(body.rows[0].rowNumber, 1);
  assert.equal(body.rows[0].firstName, "Bia");
  assert.equal(body.rows[0].email, "bia@example.test");
});

test("pedido sem arquivo, mapeamento inválido ou corpo não multipart responde 422 sem ecoar dados", async () => {
  const cases: [Request, string][] = [
    [request({ mapping: "{}" }), "missing_file"],
    [request({ file: csv("nome\nAna"), mapping: JSON.stringify({ header: true, columns: { email: 99 } }) }), "invalid_mapping"],
    [request({ file: csv("nome\nAna"), mapping: JSON.stringify({ header: true, columns: {}, extra: 1 }) }), "invalid_mapping"],
    [request({ file: csv("nome\nAna"), mapping: "{privado" }), "invalid_file"],
    [new Request("http://localhost/api/students/parse", { method: "POST", headers: { "content-type": "multipart/form-data; boundary=x" }, body: "privado" }), "invalid_form"],
  ];
  for (const [input, code] of cases) {
    const response = await POST(input);
    assert.equal(response.status, 422, code);
    const body = await response.json();
    assert.equal(body.ok, false);
    assert.equal(body.issues[0].code, code);
    assert.doesNotMatch(JSON.stringify(body), /privado/);
  }
});

test("planilha ilegível ou sem cabeçalho reconhecido devolve 422 com a orientação do leitor", async () => {
  const unreadable = await POST(request({ file: new File(["não é zip"], "alunos.xlsx") }));
  assert.equal(unreadable.status, 422);
  assert.equal((await unreadable.json()).issues[0].code, "invalid_file");
  const unknown = await POST(request({ file: csv("Ana Silva,ana@example.test\n") }));
  assert.equal(unknown.status, 422);
  const body = await unknown.json();
  assert.equal(body.issues[0].code, "mapping_required");
  assert.deepEqual(body.matrix, [["Ana Silva", "ana@example.test"]]);
});
