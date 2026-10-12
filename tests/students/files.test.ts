import test from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { parseStudentFile } from "../../src/server/students/files.ts";

const matrix = [
  ["nome", "email", "username"],
  ["Ana Silva", "ana@example.test", "ana"],
];
for (const bookType of ["xlsx", "xls"] as const) {
  test(`${bookType} preserva texto, seleciona aba e recusa mapeamento ausente`, async () => {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.aoa_to_sheet(matrix),
      "Turma",
    );
    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.aoa_to_sheet([["Bia Souza", "bia@example.test", "bia"]]),
      "Sem cabeçalho",
    );
    const bytes = new Uint8Array(
      XLSX.write(book, { type: "buffer", bookType }),
    );
    const result = await parseStudentFile({
      name: `alunos.${bookType}`,
      bytes,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.rows[0]?.firstName, "Ana");
      assert.deepEqual(result.sheetNames, ["Turma", "Sem cabeçalho"]);
    }
    const absent = await parseStudentFile({
      name: `alunos.${bookType}`,
      bytes,
      sheet: "Sem cabeçalho",
    });
    assert.equal(absent.ok, false);
    if (!absent.ok) {
      assert.equal(absent.issues[0]?.code, "mapping_required");
      assert.equal(absent.matrix?.[0]?.[0], "Bia Souza");
    }
    const explicit = await parseStudentFile({
      name: `alunos.${bookType}`,
      bytes,
      sheet: "Sem cabeçalho",
      mapping: {
        header: false,
        columns: { fullName: 0, email: 1, username: 2 },
      },
    });
    assert.equal(explicit.ok, true);
    if (explicit.ok) assert.equal(explicit.rows[0]?.rowNumber, 1);
  });
}
test("erros de formato/tamanho nunca viram registros de exemplo", async () => {
  const invalid = await parseStudentFile({
    name: "alunos.xlsx",
    bytes: new TextEncoder().encode("not a workbook"),
  });
  assert.equal(invalid.ok, false);
  const large = await parseStudentFile({
    name: "alunos.csv",
    bytes: new Uint8Array(8 * 1024 * 1024 + 1),
  });
  assert.equal(large.ok, false);
  if (!large.ok) assert.equal(large.issues[0]?.code, "file_limit");
});
