import test from "node:test";
import assert from "node:assert/strict";
import {
  parseCsv,
  mapStudentRows,
  validateStudents,
  buildStudentPreview,
} from "../../src/domain/students/index.ts";

test("CSV preserva campos com aspas, separador e linhas internas", () => {
  const rows = parseCsv(
    '\uFEFFnome;email;curso\r\n"Ana; Silva";ana@example.test;CURSO\r\n"João\nAlves";joao@example.test;CURSO',
  );
  assert.deepEqual(rows[1], ["Ana; Silva", "ana@example.test", "CURSO"]);
  assert.equal(rows[2]?.[0], "João\nAlves");
});
test("mapeamento preserva linha original e valida após edição", () => {
  const rows = mapStudentRows(
    parseCsv(
      "nome,email,username,cpf,curso\nAna Silva,ana@example.test,ana,52998224725,DEMO",
    ),
  );
  assert.equal(rows[0]?.original["nome"], "Ana Silva");
  assert.equal(validateStudents(rows).valid, true);
  rows[0]!.email = "inválido";
  rows[0]!.cpf = "11111111111";
  const result = validateStudents(rows);
  assert.equal(result.valid, false);
  assert.deepEqual(result.issues.map((issue) => issue.code).sort(), [
    "invalid_cpf",
    "invalid_email",
  ]);
});
test("duplicatas e campo obrigatório impedem CSV", async () => {
  const rows = mapStudentRows(
    parseCsv(
      "nome,email,username,cpf,curso\nAna Silva,ana@example.test,ana,,DEMO\nOutra Pessoa,ana@example.test,ana,,DEMO",
    ),
  );
  const result = await buildStudentPreview(rows, {
    mode: "create",
    enrol: true,
  });
  assert.equal(result.ok, false);
  if (!result.ok)
    assert.ok(result.issues.some((issue) => issue.code === "duplicate_email"));
});
test("prévia é vinculada a linhas/opções e não altera valores exportados", async () => {
  const rows = mapStudentRows(
    parseCsv("nome,email,username,curso\nAna Silva,ana@example.test,ana,DEMO"),
  );
  const first = await buildStudentPreview(rows, {
    mode: "create",
    enrol: true,
  });
  rows[0]!.firstName = "Maria";
  const next = await buildStudentPreview(rows, { mode: "create", enrol: true });
  assert.equal(first.ok, true);
  assert.equal(next.ok, true);
  if (first.ok && next.ok) {
    assert.notEqual(first.preview.hash, next.preview.hash);
    assert.ok(next.preview.csv.includes('"Maria"'));
    assert.equal(first.preview.rows[0]?.firstName, "Ana");
  }
});
test("CSV suspeito exige correção explícita em vez de mudar o nome", async () => {
  const rows = mapStudentRows(
    parseCsv("nome,email,username,curso\nAna Silva,ana@example.test,ana,DEMO"),
  );
  rows[0]!.firstName = '=HYPERLINK("evil")';
  const next = await buildStudentPreview(rows, { mode: "create", enrol: true });
  assert.equal(next.ok, false);
  if (!next.ok)
    assert.ok(
      next.issues.some(
        (issue) =>
          issue.code === "unsafe_csv_value" && issue.path.endsWith("firstName"),
      ),
    );
  assert.equal(rows[0]!.firstName, '=HYPERLINK("evil")');
});
test("CSV rejeita aspas encerradas seguidas de texto e cabeçalhos duplicados", () => {
  assert.throws(() => parseCsv('nome,email\n"Ana"x,ana@example.test'));
  assert.throws(() =>
    mapStudentRows([
      ["nome", "Nome", "email"],
      ["Ana", "Silva", "ana@example.test"],
    ]),
  );
});
test("planilha sem cabeçalho exige mapeamento e preserva primeiro aluno", () => {
  const matrix = [
    ["Ana Silva", "ana@example.test", "ana"],
    ["Bia Souza", "bia@example.test", "bia"],
  ];
  assert.throws(() => mapStudentRows(matrix), /mapeamento/i);
  const rows = mapStudentRows(matrix, {
    header: false,
    columns: { fullName: 0, email: 1, username: 2 },
  });
  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.rowNumber, 1);
  assert.equal(rows[0]?.firstName, "Ana");
  assert.equal(rows[0]?.original["Coluna 1"], "Ana Silva");
});
