// Spreadsheet file → column mapping → Moodle tool_uploaduser CSV, end to end through the public functions.
import test from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { parseStudentFile } from "../../src/server/students/files.ts";
import {
  buildStudentPreview,
  validateStudents,
  type StudentMapping,
  type StudentOptions,
  type StudentRow,
} from "../../src/domain/students/index.ts";

const utf8 = (text: string) => new TextEncoder().encode(text);
const enrol: StudentOptions = { mode: "create", enrol: true };
function workbook(rows: unknown[][], bookType: "xlsx" | "xls", edit?: (sheet: XLSX.WorkSheet) => void) {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  edit?.(sheet);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Alunos");
  return new Uint8Array(XLSX.write(book, { type: "buffer", bookType }));
}
async function rowsOf(name: string, bytes: Uint8Array, mapping?: StudentMapping): Promise<StudentRow[]> {
  const parsed = await parseStudentFile({ name, bytes, ...(mapping ? { mapping } : {}) });
  assert.ok(parsed.ok, JSON.stringify(parsed));
  return parsed.rows;
}
async function moodleCsv(rows: StudentRow[], options: StudentOptions = enrol) {
  const result = await buildStudentPreview(rows, options);
  assert.ok(result.ok, JSON.stringify(result));
  return result.preview;
}
const codes = (rows: StudentRow[]) =>
  validateStudents(rows).issues.map((issue) => `${issue.rowId}:${issue.code}`);

test("CSV do Excel brasileiro (BOM, ponto e vírgula, acentos) vira o CSV de importação do Moodle", async () => {
  const rows = await rowsOf(
    "turma.csv",
    utf8(
      "﻿Nome completo;E-mail;Usuário;CPF;Curso\r\n" +
        "João da Conceição;joao@example.test;joao.conceicao;529.982.247-25;BIO-101\r\n" +
        '"Maria Antônia ""Tuca"" Pereira";maria@example.test;maria.pereira;111.444.777-35;BIO-101\r\n',
    ),
  );
  assert.deepEqual(
    rows.map((row) => [row.rowNumber, row.firstName, row.lastName, row.username]),
    [
      [2, "João", "da Conceição", "joao.conceicao"],
      [3, "Maria", 'Antônia "Tuca" Pereira', "maria.pereira"],
    ],
  );
  assert.equal(rows[0]?.original["Nome completo"], "João da Conceição");
  const preview = await moodleCsv(rows);
  assert.equal(preview.count, 2);
  assert.equal(
    preview.csv,
    "username,firstname,lastname,email,idnumber,course1\r\n" +
      '"joao.conceicao","João","da Conceição","joao@example.test","529.982.247-25","BIO-101"\r\n' +
      '"maria.pereira","Maria","Antônia ""Tuca"" Pereira","maria@example.test","111.444.777-35","BIO-101"\r\n',
  );
  assert.match(preview.hash, /^[a-f0-9]{64}$/);
});

test("o mesmo conteúdo em CSV, XLSX e XLS gera o mesmo CSV e a mesma prévia", async () => {
  const matrix = [
    ["Primeiro nome", "Sobrenome", "Email", "Curso"],
    ["Ana", "Silva, Souza", "ana.silva@example.test", "MAT-1"],
    ["Bruno", "Lima", "bruno@example.test", "MAT-1"],
  ];
  const csv = matrix.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
  const previews = await Promise.all([
    rowsOf("alunos.csv", utf8(csv)).then((rows) => moodleCsv(rows)),
    rowsOf("alunos.xlsx", workbook(matrix, "xlsx")).then((rows) => moodleCsv(rows)),
    rowsOf("alunos.xls", workbook(matrix, "xls")).then((rows) => moodleCsv(rows)),
  ]);
  // Without a username column the login comes from the e-mail local part.
  assert.equal(
    previews[0]!.csv,
    "username,firstname,lastname,email,idnumber,course1\r\n" +
      '"ana.silva","Ana","Silva, Souza","ana.silva@example.test","","MAT-1"\r\n' +
      '"bruno","Bruno","Lima","bruno@example.test","","MAT-1"\r\n',
  );
  for (const preview of previews.slice(1)) {
    assert.equal(preview.csv, previews[0]!.csv);
    assert.equal(preview.hash, previews[0]!.hash);
  }
});

test("CPF numérico de planilha perde o zero à esquerda e é apontado como inválido, nunca corrigido", async () => {
  const rows = await rowsOf(
    "alunos.xlsx",
    workbook(
      [
        ["nome", "email", "cpf"],
        ["Ana Silva", "ana@example.test", 52998224725],
        ["Bia Souza", "bia@example.test", 1234567890],
        ["Caio Reis", "caio@example.test", "01234567890"],
      ],
      "xlsx",
    ),
  );
  assert.deepEqual(rows.map((row) => row.cpf), ["52998224725", "1234567890", "01234567890"]);
  assert.deepEqual(codes(rows), ["row-3:invalid_cpf"]);
});

test("célula com fórmula em XLSX é recusada antes de ler valores possivelmente desatualizados", async () => {
  for (const bookType of ["xlsx"] as const) {
    const parsed = await parseStudentFile({
      name: `alunos.${bookType}`,
      bytes: workbook(
        [
          ["nome", "email"],
          ["Ana Silva", "ana@example.test"],
        ],
        bookType,
        (sheet) => {
          sheet["B2"] = { t: "s", v: "ana@example.test", f: 'LOWER("ANA@EXAMPLE.TEST")' };
        },
      ),
    });
    assert.equal(parsed.ok, false, bookType);
    if (!parsed.ok) assert.equal(parsed.issues[0]?.code, "formula_cell");
  }
});

test("texto que começa como fórmula bloqueia o CSV do Moodle e não é alterado", async () => {
  const rows = await rowsOf(
    "alunos.csv",
    utf8(
      "nome,email,username,curso\n" +
        "=HYPERLINK(1) Silva,ana@example.test,ana,DEMO\n" +
        "Bia Souza,bia@example.test,@bia,DEMO\n" +
        "Caio Reis-Lima,caio@example.test,caio,  -DEMO\n" +
        "Davi Melo,davi@example.test,davi,DEMO\n",
    ),
  );
  const result = await buildStudentPreview(rows, enrol);
  assert.equal(result.ok, false);
  if (!result.ok)
    assert.deepEqual(
      result.issues.map((issue) => `${issue.rowId}:${issue.code}:${issue.path}`),
      [
        "row-2:unsafe_csv_value:rows[0].firstName",
        "row-3:unsafe_csv_value:rows[1].username",
        "row-4:unsafe_csv_value:rows[2].course",
      ],
    );
  assert.equal(rows[0]?.firstName, "=HYPERLINK(1)");
  // Signs inside a value are ordinary text; the course is only checked when it is exported.
  const withoutCourse = await buildStudentPreview([rows[2]!, rows[3]!], { mode: "create", enrol: false });
  assert.equal(withoutCourse.ok, true);
});

test("CSV fora de UTF-8 é recusado em vez de gravar acentos corrompidos", async () => {
  // "João" in Windows-1252: the ã is the single byte 0xE3.
  const latin1 = new Uint8Array([...utf8("nome,email\nJo"), 0xe3, ...utf8("o Silva,joao@example.test\n")]);
  const parsed = await parseStudentFile({ name: "alunos.csv", bytes: latin1 });
  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert.equal(parsed.issues[0]?.code, "invalid_file");
    assert.equal(parsed.matrix, undefined);
  }
  const rows = await rowsOf("alunos.csv", utf8("﻿nome,email\nJoão Silva,joao@example.test\n"));
  assert.equal(rows[0]?.firstName, "João");
});

test("duplicados de usuário, e-mail e CPF são detectados sem diferenciar maiúsculas ou pontuação", async () => {
  const rows = await rowsOf(
    "alunos.csv",
    utf8(
      "nome,email,username,cpf\n" +
        "Ana Silva,ana@example.test,ana.silva,529.982.247-25\n" +
        "Ana Souza,ANA@Example.test,Ana.Silva,52998224725\n" +
        "Bia Lima,bia@example.test,bia,\n" +
        "Bia Reis,bia2@example.test,bia2,\n",
    ),
  );
  assert.deepEqual(codes(rows), [
    "row-3:duplicate_email",
    "row-3:duplicate_username",
    "row-3:duplicate_cpf",
  ]);
  const result = await buildStudentPreview(rows, { mode: "create", enrol: false });
  assert.equal(result.ok, false);
});

test("CPF, e-mail, nome e usuário inválidos são apontados por linha", async () => {
  const rows = await rowsOf(
    "alunos.csv",
    utf8(
      "nome,email,username,cpf\n" +
        "Ana Silva,ana@example.test,ana,529.982.247-24\n" +
        "Bia Souza,bia@example.test,bia,111.111.111-11\n" +
        "Caio Reis,caio@example.test,caio,5299822472\n" +
        "Davi Melo,davi.example.test,davi,\n" +
        "Eva,eva@example.test,eva,\n" +
        "Fábio Luz,fabio@example.test,fábio luz,\n",
    ),
  );
  assert.deepEqual(codes(rows), [
    "row-2:invalid_cpf",
    "row-3:invalid_cpf",
    "row-4:invalid_cpf",
    "row-5:invalid_email",
    "row-6:required_name",
    "row-7:invalid_username",
  ]);
});

test("modo atualização sem matrícula omite course1; matrícula exige curso em cada linha", async () => {
  const rows = await rowsOf(
    "alunos.csv",
    utf8("nome,email,curso\nAna Silva,ana@example.test,\nBia Souza,bia@example.test,DEMO\n"),
  );
  const update = await moodleCsv(rows, { mode: "update", enrol: false });
  assert.equal(
    update.csv,
    "username,firstname,lastname,email,idnumber\r\n" +
      '"ana","Ana","Silva","ana@example.test",""\r\n' +
      '"bia","Bia","Souza","bia@example.test",""\r\n',
  );
  assert.deepEqual(update.options, { mode: "update", enrol: false });
  const create = await buildStudentPreview(rows, { mode: "create", enrol: false });
  assert.ok(create.ok);
  assert.notEqual(create.preview.hash, update.hash);
  const missing = await buildStudentPreview(rows, enrol);
  assert.equal(missing.ok, false);
  if (!missing.ok)
    assert.deepEqual(missing.issues.map((issue) => `${issue.rowId}:${issue.code}`), ["row-2:required_course"]);
  const invalid = await buildStudentPreview(rows, { mode: "delete", enrol: false } as unknown as StudentOptions);
  assert.equal(invalid.ok, false);
  if (!invalid.ok) assert.equal(invalid.issues[0]?.code, "invalid_options");
});

test("planilha sem cabeçalho só é lida com mapeamento explícito e começa no primeiro aluno", async () => {
  const bytes = utf8("Ana Silva;ana@example.test;BIO\nBia Souza;bia@example.test;BIO\n");
  const unmapped = await parseStudentFile({ name: "alunos.csv", bytes });
  assert.equal(unmapped.ok, false);
  if (!unmapped.ok) {
    assert.equal(unmapped.issues[0]?.code, "mapping_required");
    assert.deepEqual(unmapped.matrix?.[0], ["Ana Silva", "ana@example.test", "BIO"]);
  }
  const rows = await rowsOf("alunos.csv", bytes, {
    header: false,
    columns: { fullName: 0, email: 1, course: 2 },
  });
  assert.deepEqual(rows.map((row) => row.rowNumber), [1, 2]);
  assert.equal(rows[0]?.original["Coluna 3"], "BIO");
  const preview = await moodleCsv(rows);
  assert.equal(preview.csv.split("\r\n")[1], '"ana","Ana","Silva","ana@example.test","","BIO"');
});

test("estrutura inconsistente pede mapeamento sem inventar colunas", async () => {
  for (const [content, mapping] of [
    ["nome,email\nAna Silva,ana@example.test,extra\n", undefined],
    ["nome,,email\nAna Silva,x,ana@example.test\n", undefined],
    ["coluna a,coluna b\nAna Silva,ana@example.test\n", undefined],
    ["nome,email\nAna Silva,ana@example.test\n", { header: true, columns: { fullName: 0, email: 5 } }],
  ] as const) {
    const parsed = await parseStudentFile({
      name: "alunos.csv",
      bytes: utf8(content),
      ...(mapping ? { mapping } : {}),
    });
    assert.equal(parsed.ok, false, content);
    if (!parsed.ok) {
      assert.equal(parsed.issues[0]?.code, "mapping_required");
      assert.ok(parsed.matrix?.length);
    }
  }
  const quotes = await parseStudentFile({ name: "alunos.csv", bytes: utf8('nome,email\n"Ana Silva,ana@example.test\n') });
  assert.equal(quotes.ok, false);
  if (!quotes.ok) assert.equal(quotes.issues[0]?.code, "invalid_file");
  const other = await parseStudentFile({ name: "alunos.ods", bytes: utf8("x") });
  assert.equal(other.ok, false);
  if (!other.ok) assert.equal(other.issues[0]?.code, "invalid_file");
});
