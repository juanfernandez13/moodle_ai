import test from "node:test";
import assert from "node:assert/strict";
import {
  parseCsv,
  mapStudentRows,
  validateStudents,
  buildStudentPreview,
  deriveStudentUsername,
} from "../../src/domain/students/index.ts";

test("CSV preserva campos com aspas, separador e linhas internas", () => {
  const rows = parseCsv(
    '\uFEFFnome;email;curso\r\n"Ana; Silva";ana@example.test;CURSO\r\n"João\nAlves";joao@example.test;CURSO',
  );
  assert.deepEqual(rows[1], ["Ana; Silva", "ana@example.test", "CURSO"]);
  assert.equal(rows[2]?.[0], "João\nAlves");
});
test("a coluna da turma é lida tanto como Disciplina (modelo novo) quanto como Curso (planilhas antigas)", () => {
  for (const header of ["Disciplina", "Curso", "curso", "course1"]) {
    const rows = mapStudentRows(
      parseCsv(
        `Nome completo;E-mail;CPF;${header}\nAna Silva;ana@example.test;52998224725;DEMO`,
      ),
    );
    assert.equal(rows[0]?.course, "DEMO", header);
  }
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

test("o hash da prévia não depende da ordem das chaves das linhas: a tela e o servidor as montam em ordens diferentes", async () => {
  // A planilha monta a linha como (nome, sobrenome, e-mail, usuário); o servidor a lê pelo esquema como (usuário, nome,
  // sobrenome, e-mail). Se o hash mudasse com isso, "Enviar ao Moodle" recusaria toda prévia como desatualizada.
  const rows = mapStudentRows(
    parseCsv("Nome completo,E-mail,Disciplina\nAna Souza,ana@example.test,DEMO"),
  );
  assert.deepEqual(Object.keys(rows[0]!).slice(2, 7), [
    "original",
    "firstName",
    "lastName",
    "email",
    "username",
  ]);
  const schemaOrder = rows.map((row) => ({
    id: row.id,
    rowNumber: row.rowNumber,
    original: row.original,
    username: row.username,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    cpf: row.cpf,
    course: row.course,
  }));
  for (const options of [
    { mode: "create", enrol: true },
    { enrol: false, mode: "update" },
  ] as const) {
    const fromScreen = await buildStudentPreview(rows, options);
    const fromServer = await buildStudentPreview(schemaOrder, options);
    assert.ok(fromScreen.ok && fromServer.ok);
    if (!fromScreen.ok || !fromServer.ok) return;
    assert.equal(fromScreen.preview.hash, fromServer.preview.hash);
    assert.equal(fromScreen.preview.csv, fromServer.preview.csv);
    // O que sai é sempre na mesma ordem, e as linhas continuam iguais em conteúdo.
    assert.deepEqual(
      Object.keys(fromScreen.preview.rows[0]!),
      Object.keys(schemaOrder[0]!),
    );
    assert.deepEqual(fromScreen.preview.rows, schemaOrder);
  }
});

// Planilha já no formato de importação do Moodle (os títulos são os do Moodle em português): o CPF vem em
// "Identificação do Usuário", "Nome" é só o primeiro nome e há espaço sobrando em algumas células.
const MOODLE_HEADER = "Senha,Identificação do Usuário,Nome,Sobrenome,E-Mail,Cidade,Curso,Perfil";
test("planilha no formato do Moodle: a identificação do usuário é o usuário, e não o começo do e-mail", () => {
  const rows = mapStudentRows(
    parseCsv(`${MOODLE_HEADER}\n,52998224725,Ana,Paz da Silva,pana37349@example.test,Fortaleza,DEMO,Aluno`),
  );
  assert.equal(rows[0]?.username, "52998224725");
  assert.equal(rows[0]?.firstName, "Ana");
  assert.equal(rows[0]?.lastName, "Paz da Silva");
  assert.equal(rows[0]?.course, "DEMO");
});
test("com uma coluna de sobrenome, o Nome inteiro é o primeiro nome", () => {
  const rows = mapStudentRows(
    parseCsv(`${MOODLE_HEADER}\n,52998224725,Maria Clara,Souza,mc@example.test,,DEMO,Aluno`),
  );
  assert.equal(rows[0]?.firstName, "Maria Clara");
  assert.equal(rows[0]?.lastName, "Souza");
  // Sem sobrenome em coluna própria, o primeiro nome continua sendo só a primeira palavra.
  const full = mapStudentRows(parseCsv("Nome completo,E-mail,curso\nMaria Clara Souza,mc@example.test,DEMO"));
  assert.equal(full[0]?.firstName, "Maria");
  assert.equal(full[0]?.lastName, "Clara Souza");
});
test("espaço antes ou depois do valor não vira pendência, e a linha original fica como veio", () => {
  const rows = mapStudentRows(
    parseCsv(`${MOODLE_HEADER}\n,"52998224725 ", Ana  Maria ,Silva,"ana@example.test ",,DEMO,Aluno`),
  );
  assert.equal(rows[0]?.username, "52998224725");
  assert.equal(rows[0]?.email, "ana@example.test");
  assert.equal(rows[0]?.firstName, "Ana Maria");
  assert.equal(rows[0]?.original["Identificação do Usuário"], "52998224725 ");
  assert.equal(validateStudents(rows).valid, true);
});
test("um aluno repetido diz qual linha ele repete e junta e-mail, usuário e CPF numa frase só", () => {
  const rows = mapStudentRows(
    parseCsv(
      [
        MOODLE_HEADER,
        ",52998224725,Ana,Silva,ana@example.test,,DEMO,Aluno",
        ",11144477735,Bruno,Lima,bruno@example.test,,DEMO,Aluno",
        ",52998224725,Ana Maria,Silva,ana@example.test,,DEMO,Aluno",
      ].join("\n"),
    ),
  );
  const { issues } = validateStudents(rows);
  // Os códigos e os campos continuam separados (cada campo fica em vermelho)...
  assert.deepEqual(
    issues.map((issue) => `${issue.rowId}:${issue.code}`),
    ["row-4:duplicate_email", "row-4:duplicate_username", "row-4:duplicate_cpf"],
  );
  // ...mas a frase é a mesma, diz a linha e chama de CPF o login que veio do CPF.
  assert.deepEqual([...new Set(issues.map((issue) => issue.message))], ["Repete a linha 2: mesmo e-mail e CPF."]);
});

// O login é o CPF (como no app original). Sem coluna de login, ele sai do CPF, só os dígitos; sem CPF, do começo do e-mail.
test("o login sai do CPF, só os dígitos, e a planilha do Moodle em português traz o CPF em \"Identificação do Usuário\"", () => {
  const rows = mapStudentRows(
    parseCsv(`${MOODLE_HEADER}
,529.982.247-25,Ana,Silva,ana@example.test,,DEMO,Aluno
,,Bia,Souza,bia@example.test,,DEMO,Aluno`),
  );
  assert.deepEqual(
    rows.map((row) => [row.cpf, row.username]),
    [
      ["529.982.247-25", "52998224725"],
      ["", "bia"],
    ],
  );
  assert.equal(deriveStudentUsername({ cpf: " 529.982.247-25 ", email: "x@y.z" }), "52998224725");
  assert.equal(deriveStudentUsername({ cpf: "", email: "x.y@z.w" }), "x.y");
  // Um login escrito na planilha (coluna "Usuário") continua sendo o que a planilha disse.
  const own = mapStudentRows(parseCsv("Nome completo;E-mail;Usuário;CPF\nAna Silva;ana@example.test;ana.silva;529.982.247-25"));
  assert.equal(own[0]?.username, "ana.silva");
  assert.equal(own[0]?.cpf, "529.982.247-25");
});
test("um CPF com dígitos a menos ou com dígito verificador errado diz o que há de errado", () => {
  const rows = mapStudentRows(
    parseCsv(`${MOODLE_HEADER}
,52998224725,Ana,A,a@example.test,,DEMO,Aluno
,5299822472,Bia,B,b@example.test,,DEMO,Aluno
,52998224724,Caio,C,c@example.test,,DEMO,Aluno`),
  );
  assert.deepEqual(
    validateStudents(rows).issues.map((issue) => [issue.rowId, issue.code, issue.path.split(".").at(-1), issue.message]),
    [
      ["row-3", "invalid_cpf", "cpf", "O CPF tem 10 dígitos; precisa de 11."],
      ["row-4", "invalid_cpf", "cpf", "Confira os dígitos do CPF."],
    ],
  );
});

// Login escrito na planilha, sem CPF ao lado: quem usa o CPF como login tem quase todos iguais a um CPF válido.
const LOGIN_SHEET = (usernames: string[]) =>
  [
    "Usuário,Nome,Sobrenome,E-mail",
    ...usernames.map((username, index) => `${username},Aluno,N${index},aluno${index}@example.test`),
  ].join("\n");
test("quando os logins da planilha são CPFs, um só de números que não é CPF vira pendência", () => {
  const rows = mapStudentRows(
    parseCsv(LOGIN_SHEET(["52998224725", "11144477735", "390.533.447-05", "5299822472", "52998224724"])),
  );
  assert.deepEqual(
    validateStudents(rows).issues.map(
      (issue) => `${issue.rowId}:${issue.code}:${issue.path.split(".").at(-1)}:${issue.message}`,
    ),
    [
      "row-5:invalid_cpf:username:O CPF tem 10 dígitos; precisa de 11.",
      "row-6:invalid_cpf:username:Confira os dígitos do CPF.",
    ],
  );
});
test("logins comuns, ou uma minoria de CPFs, não são tratados como CPF", () => {
  const issues = (usernames: string[]) => validateStudents(mapStudentRows(parseCsv(LOGIN_SHEET(usernames)))).issues;
  // Logins de gente: nada a conferir.
  assert.deepEqual(issues(["ana", "bruno.lima", "carla-souza"]), []);
  // Matrículas de 8 dígitos com um único CPF no meio: a minoria não define a regra.
  assert.deepEqual(issues(["20240001", "20240002", "20240003", "52998224725"]), []);
  // Login com letra numa planilha de CPFs é outra coisa (um professor, por exemplo), não um CPF errado.
  assert.deepEqual(issues(["52998224725", "11144477735", "prof.joao"]), []);
});
