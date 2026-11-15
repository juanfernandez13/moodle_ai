import { hash256 } from "../../shared/archive.ts";
import { z } from "zod";

export type StudentRow = {
  id: string;
  rowNumber: number;
  original: Record<string, string>;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  cpf: string;
  course: string;
};
export type StudentIssue = {
  code: string;
  path: string;
  rowId: string;
  message: string;
};
/** A row that writes again a student already in the list; `first` is the spreadsheet line that goes in its place. */
export type StudentRepeat = { rowId: string; rowNumber: number; first: number };
export type StudentOptions = { mode: "create" | "update"; enrol: boolean };
export type StudentPreview = {
  hash: string;
  csv: string;
  count: number;
  rows: StudentRow[];
  options: StudentOptions;
};
export type StudentMapping = {
  header: boolean;
  columns: Partial<
    Record<
      | "fullName"
      | "firstName"
      | "lastName"
      | "email"
      | "username"
      | "cpf"
      | "course",
      number
    >
  >;
};
const columnSchema = z.number().int().min(0).max(63).optional();
export const studentMappingSchema = z.strictObject({
  header: z.boolean(),
  columns: z.strictObject({
    fullName: columnSchema,
    firstName: columnSchema,
    lastName: columnSchema,
    email: columnSchema,
    username: columnSchema,
    cpf: columnSchema,
    course: columnSchema,
  }),
});

export function parseCsv(text: string): string[][] {
  if (text.length > 5_000_000)
    throw new Error("A planilha CSV deve ter no máximo 5 MB.");
  const source = text.replace(/^\uFEFF/, "");
  let comma = 0,
    semicolon = 0,
    inQuote = false;
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (char === '"') {
      if (inQuote && source[index + 1] === '"') index++;
      else inQuote = !inQuote;
    }
    if (!inQuote) {
      if (char === "\n" || char === "\r") break;
      if (char === ",") comma++;
      if (char === ";") semicolon++;
    }
  }
  const separator = semicolon > comma ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [],
    value = "",
    quoted = false,
    closedQuote = false;
  for (let index = 0; index < source.length; index++) {
    const char = source[index]!;
    if (closedQuote && char !== separator && char !== "\n" && char !== "\r")
      throw new Error("Há texto após o encerramento de um campo entre aspas.");
    if (char === '"') {
      if (quoted && source[index + 1] === '"') {
        value += '"';
        index++;
      } else if (!quoted && value !== "")
        throw new Error("Há aspas fora do início de um campo.");
      else {
        closedQuote = quoted;
        quoted = !quoted;
      }
    } else if (char === separator && !quoted) {
      row.push(value);
      value = "";
      closedQuote = false;
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[index + 1] === "\n") index++;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      closedQuote = false;
      if (rows.length > 10_001)
        throw new Error("A planilha aceita até 10.000 alunos.");
    } else value += char;
  }
  if (quoted) throw new Error("Um campo entre aspas não foi fechado.");
  if (value !== "" || row.length) {
    row.push(value);
    rows.push(row);
  }
  return rows.filter((items) => items.some((item) => item !== ""));
}

/**
 * The login a student gets when the spreadsheet has no login column: the CPF, digits only (the login at IFCE, and what the
 * original app did), or, when there is no CPF, the first part of the e-mail. The review screen keeps it in step while the
 * CPF or the e-mail is edited, and shows a login column only when the spreadsheet brought a login of its own.
 */
export function deriveStudentUsername(row: { cpf: string; email: string }): string {
  const cpf = row.cpf.trim();
  if (cpf) return /^[\d.\-\s]+$/.test(cpf) ? cpf.replace(/\D/g, "") : cpf;
  return row.email.split("@")[0] ?? "";
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[ _-]/g, "");
export function mapStudentRows(
  matrix: readonly (readonly (string | number | null | undefined)[])[],
  mapping?: StudentMapping,
): StudentRow[] {
  if (mapping && !studentMappingSchema.safeParse(mapping).success)
    throw new Error("Confira o mapeamento de colunas.");
  const hasHeader = mapping?.header ?? true;
  if (
    matrix.length < (hasHeader ? 2 : 1) ||
    matrix.length > (hasHeader ? 10_001 : 10_000) ||
    matrix.some((row) => row.length > 64)
  )
    throw new Error("Use até 10.000 alunos e 64 colunas.");
  const width = Math.max(...matrix.map((row) => row.length));
  const headers = hasHeader
    ? (matrix[0] ?? []).map((value) => String(value ?? ""))
    : Array.from({ length: width }, (_, index) => `Coluna ${index + 1}`);
  const keys = headers.map(normalize);
  if (
    hasHeader &&
    (new Set(keys).size !== keys.length || keys.some((key) => !key))
  )
    throw new Error("Os cabeçalhos devem ser preenchidos e únicos.");
  if (matrix.some((row) => row.length > headers.length))
    throw new Error(
      "Uma linha tem mais colunas que o cabeçalho; confira o mapeamento.",
    );
  const locate = (...aliases: string[]) =>
    keys.findIndex((key) => aliases.includes(key));
  const automatic = {
    full: locate("nome", "nomecompleto", "fullname"),
    first: locate("firstname", "primeironome"),
    last: locate("lastname", "sobrenome"),
    email: locate("email", "correioeletronico"),
    username: locate("username", "usuario", "login", "nomedeusuario"),
    // "Identificação do usuário" é como o Moodle em português rotula o login, e no IFCE o login é o CPF: planilhas já
    // no formato de importação do Moodle trazem esse título para a coluna do CPF.
    cpf: locate("cpf", "idnumber", "identificacaodousuario"),
    course: locate("disciplina", "curso", "course", "course1"),
  };
  if (
    !mapping &&
    automatic.full < 0 &&
    automatic.first < 0 &&
    automatic.email < 0 &&
    automatic.cpf < 0 &&
    automatic.username < 0
  )
    throw new Error(
      "Cabeçalho não reconhecido: selecione um mapeamento explícito; a primeira linha foi preservada.",
    );
  const columns = mapping
    ? {
        full: mapping.columns.fullName ?? -1,
        first: mapping.columns.firstName ?? -1,
        last: mapping.columns.lastName ?? -1,
        email: mapping.columns.email ?? -1,
        username: mapping.columns.username ?? -1,
        cpf: mapping.columns.cpf ?? -1,
        course: mapping.columns.course ?? -1,
      }
    : automatic;
  if (Object.values(columns).some((column) => column >= width))
    throw new Error("Uma coluna mapeada não existe na planilha.");
  const start = hasHeader ? 1 : 0;
  return matrix.slice(start).map((values, index) => {
    // Espaço antes ou depois do valor (comum em planilha digitada) nunca faz parte dele; o original, abaixo, fica como veio.
    const field = (column: number) =>
      column < 0 ? "" : String(values[column] ?? "").trim();
    const name = (column: number) => field(column).replace(/\s+/g, " ");
    const parts = name(columns.full).split(" ");
    const email = field(columns.email);
    const cpf = field(columns.cpf);
    return {
      id: `row-${index + start + 1}`,
      rowNumber: index + start + 1,
      original: Object.fromEntries(
        headers.map((header, column) => [header, String(values[column] ?? "")]),
      ),
      // Com uma coluna de sobrenome, "Nome" é só o primeiro nome (como no Moodle): "Maria Clara" não perde o "Clara".
      firstName:
        columns.first >= 0
          ? name(columns.first)
          : columns.last >= 0
            ? name(columns.full)
            : (parts[0] ?? ""),
      lastName:
        columns.last >= 0
          ? name(columns.last)
          : parts.slice(1).join(" "),
      email,
      username:
        columns.username < 0
          ? deriveStudentUsername({ cpf, email })
          : field(columns.username),
      cpf,
      course: field(columns.course),
    };
  });
}

const studentSchema = z.strictObject({
  id: z.string().min(1).max(128),
  rowNumber: z.number().int().min(1),
  original: z.record(z.string(), z.string().max(10_000)),
  username: z.string().max(100),
  firstName: z.string().max(200),
  lastName: z.string().max(200),
  email: z.string().max(254),
  cpf: z.string().max(20),
  course: z.string().max(200),
});
function validCpf(value: string): boolean {
  const digits = value.replace(/[.\-\s]/g, "");
  if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;
  for (const length of [9, 10]) {
    const sum = Array.from(
      digits.slice(0, length),
      (char, index) => Number(char) * (length + 1 - index),
    ).reduce((total, number) => total + number, 0);
    const digit = ((sum * 10) % 11) % 10;
    if (digit !== Number(digits[length])) return false;
  }
  return true;
}
/** What is wrong with a CPF, in one sentence, or null when it is a valid one. A count of digits says more than "confira". */
function cpfProblem(value: string): string | null {
  if (validCpf(value)) return null;
  const digits = value.replace(/\D/g, "").length;
  return /^[\d.\-\s]+$/.test(value) && digits !== 11
    ? `O CPF tem ${digits} ${digits === 1 ? "dígito" : "dígitos"}; precisa de 11.`
    : "Confira os dígitos do CPF.";
}
/**
 * What is wrong with an e-mail, in one sentence, or null when it is one. The rule is the original app's, by the owner's
 * decision: one "@", no spaces, a domain with a dot. An address with an accented letter passes, as it does there (Moodle
 * creates that account with a warning); a stricter check made the review report errors the teacher does not count as one.
 */
function emailProblem(value: string): string | null {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return null;
  if (/\s/.test(value)) return "O e-mail tem espaço.";
  if (value && !value.includes("@")) return "Falta o @ no e-mail.";
  return "Informe um e-mail válido.";
}
const duplicateLabels = { email: "e-mail", username: "usuário", cpf: "CPF" } as const;
const joinWords = (words: string[]) =>
  words.length < 2 ? (words[0] ?? "") : `${words.slice(0, -1).join(", ")} e ${words.at(-1)}`;
/**
 * The same student written twice in the list: same login, e-mail, CPF, name and course. Capitals, accents and where the
 * first name ends ("Ana | Paula Lima" or "Ana Paula | Lima") do not make it another person. Such a row is nothing to fix:
 * the student goes once, by the first row. A row that shares the CPF or the e-mail under ANOTHER name is a conflict and
 * stays a pendência, because leaving it out could lose a student.
 * Returns, for each row, the spreadsheet line it repeats (undefined when it repeats none).
 */
function repeatedStudents(rows: readonly StudentRow[]): (number | undefined)[] {
  const firsts = new Map<string, number>();
  return rows.map((row) => {
    if (!row.username.trim() || !row.email.trim()) return undefined;
    const key = JSON.stringify([
      row.username.toLowerCase(),
      row.email.toLowerCase(),
      row.cpf.replace(/[.\-\s]/g, ""),
      `${row.firstName} ${row.lastName}`
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .join(" "),
      row.course.trim().toLowerCase(),
    ]);
    const first = firsts.get(key);
    if (first === undefined) firsts.set(key, row.rowNumber);
    return first;
  });
}
export function validateStudents(rows: readonly StudentRow[]): {
  valid: boolean;
  issues: StudentIssue[];
  /** Rows that repeat a student of an earlier row. They block nothing and stay out of the CSV. */
  repeats: StudentRepeat[];
} {
  const structure = z.array(studentSchema).min(1).max(10_000).safeParse(rows);
  if (!structure.success)
    return {
      valid: false,
      issues: structure.error.issues.map((issue) => ({
        code: "invalid_student",
        path: `rows.${issue.path.join(".")}`,
        rowId: "",
        message: "Confira a estrutura e os limites desta linha.",
      })),
      repeats: [],
    };
  const issues: StudentIssue[] = [];
  const repeated = repeatedStudents(rows);
  // Valor → linha da planilha em que apareceu primeiro, para dizer qual é a outra.
  const seen = {
    id: new Map<string, number>(),
    email: new Map<string, number>(),
    username: new Map<string, number>(),
    cpf: new Map<string, number>(),
  };
  // Login escrito na planilha, sem CPF ao lado: quem usa o CPF como login tem quase todos iguais a um CPF válido. Nessa
  // planilha, um login só de números que não é CPF (10 dígitos, dígito verificador errado) é quase sempre erro de
  // digitação, e criaria uma conta com o login errado. Numa planilha de logins comuns (ana, bruno.lima) nada disso vale.
  const loginOnly = rows.filter((row) => !row.cpf.trim());
  const cpfUsers = loginOnly.filter((row) => validCpf(row.username)).length;
  const usernamesAreCpf = cpfUsers > 0 && cpfUsers * 2 >= loginOnly.length;
  rows.forEach((row, index) => {
    const add = (code: string, field: string, message: string) =>
      issues.push({
        code,
        path: `rows[${index}].${field}`,
        rowId: row.id,
        message,
      });
    if (!/^[a-zA-Z0-9_.@-]+$/.test(row.username))
      add(
        "invalid_username",
        "username",
        "Informe um usuário sem espaços, usando letras, números, ponto, hífen ou sublinhado.",
      );
    else if (usernamesAreCpf && !row.cpf.trim() && /^[\d.-]+$/.test(row.username)) {
      const problem = cpfProblem(row.username);
      if (problem) add("invalid_cpf", "username", problem);
    }
    if (!row.firstName.trim())
      add("required_name", "firstName", "Preencha o primeiro nome.");
    if (!row.lastName.trim())
      add("required_name", "lastName", "Preencha o sobrenome.");
    const emailIssue = emailProblem(row.email);
    if (emailIssue) add("invalid_email", "email", emailIssue);
    const cpfIssue = row.cpf.trim() ? cpfProblem(row.cpf) : null;
    if (cpfIssue) add("invalid_cpf", "cpf", cpfIssue);
    // Duas linhas com o mesmo CPF ou e-mail e nomes diferentes: uma frase só diz tudo, e cada campo continua marcado em
    // vermelho (a tela junta as frases iguais da mesma linha numa pendência só). O mesmo aluno escrito de novo não entra
    // aqui: os valores dele já foram vistos na primeira linha, e só o id (que é da linha, não do aluno) é conferido.
    const repeats = new Map<number, ("id" | "email" | "username" | "cpf")[]>();
    for (const field of repeated[index] === undefined
      ? (["id", "email", "username", "cpf"] as const)
      : (["id"] as const)) {
      const value =
        field === "cpf"
          ? row.cpf.replace(/[.\-\s]/g, "")
          : row[field].toLowerCase();
      if (!value) continue;
      const first = seen[field].get(value);
      if (first !== undefined) repeats.set(first, [...(repeats.get(first) ?? []), field]);
      else seen[field].set(value, row.rowNumber);
    }
    for (const [first, fields] of repeats) {
      // O login que veio do CPF não é "usuário" para quem lê: é o CPF.
      const loginIsCpf = row.cpf.trim() !== "" && row.username === deriveStudentUsername(row);
      const what = [
        ...new Set(
          fields.flatMap((field) =>
            field === "id" ? [] : [field === "username" && loginIsCpf ? "CPF" : duplicateLabels[field]],
          ),
        ),
      ];
      const message = what.length
        ? `Repete a linha ${first}: mesmo ${joinWords(what)}.`
        : "Este valor já aparece em outra linha.";
      for (const field of fields) add(`duplicate_${field}`, field, message);
    }
  });
  return {
    valid: issues.length === 0,
    issues,
    repeats: rows.flatMap((row, index) => {
      const first = repeated[index];
      return first === undefined ? [] : [{ rowId: row.id, rowNumber: row.rowNumber, first }];
    }),
  };
}

const cell = (value: string) => '"' + value.replace(/"/g, '""') + '"';
export async function buildStudentPreview(
  rows: readonly StudentRow[],
  options: StudentOptions,
): Promise<
  { ok: true; preview: StudentPreview } | { ok: false; issues: StudentIssue[] }
> {
  const validation = validateStudents(rows);
  if (!validation.valid) return { ok: false, issues: validation.issues };
  if (
    !["create", "update"].includes(options.mode) ||
    typeof options.enrol !== "boolean"
  )
    return {
      ok: false,
      issues: [
        {
          code: "invalid_options",
          path: "options",
          rowId: "",
          message: "Confira as opções de cadastro.",
        },
      ],
    };
  if (options.enrol && rows.some((row) => !row.course.trim()))
    return {
      ok: false,
      issues: rows
        .filter((row) => !row.course.trim())
        .map((row) => ({
          code: "required_course",
          path: "course",
          rowId: row.id,
          message: "Informe o nome curto da disciplina para matrícula.",
        })),
    };
  const unsafe = rows.flatMap((row, index) =>
    (
      [
        "username",
        "firstName",
        "lastName",
        "email",
        "cpf",
        ...(options.enrol ? ["course" as const] : []),
      ] as const
    )
      .filter((field) => /^[\s]*[=+@-]/.test(row[field]))
      .map((field) => ({
        code: "unsafe_csv_value",
        path: `rows[${index}].${field}`,
        rowId: row.id,
        message:
          "Este valor começa como fórmula de planilha. Confira e corrija explicitamente antes de exportar; nenhum valor foi alterado.",
      })),
  );
  if (unsafe.length) return { ok: false, issues: unsafe };
  // O mesmo aluno escrito duas vezes vai uma vez só, pela primeira linha. Com as duas no CSV, o Moodle recusa a segunda
  // em "criar novos" ("já cadastrado") e o resultado, que é por login, marcaria erro num aluno que foi criado.
  const repeated = new Set(validation.repeats.map((repeat) => repeat.rowId));
  // Ordem fixa das chaves: a planilha monta a linha de um jeito e o servidor, ao validá-la, de outro. O hash é do texto
  // JSON, então sem isso a tela e o servidor discordariam da mesma lista e toda prévia viria como "desatualizada".
  const copied = structuredClone(rows.filter((row) => !repeated.has(row.id))).map(
    (row): StudentRow => ({
      id: row.id,
      rowNumber: row.rowNumber,
      original: row.original,
      username: row.username,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      cpf: row.cpf,
      course: row.course,
    }),
  );
  const orderedOptions: StudentOptions = {
    mode: options.mode,
    enrol: options.enrol,
  };
  const headers = [
    "username",
    "firstname",
    "lastname",
    "email",
    "idnumber",
    ...(options.enrol ? ["course1"] : []),
  ];
  const csv =
    headers.join(",") +
    "\r\n" +
    copied
      .map((row) =>
        [
          row.username,
          row.firstName,
          row.lastName,
          row.email,
          row.cpf,
          ...(options.enrol ? [row.course] : []),
        ]
          .map(cell)
          .join(","),
      )
      .join("\r\n") +
    "\r\n";
  const hash = await hash256(
    new TextEncoder().encode(
      JSON.stringify({ rows: copied, options: orderedOptions, csv }),
    ),
  );
  return {
    ok: true,
    preview: {
      hash,
      csv,
      count: copied.length,
      rows: copied,
      options: orderedOptions,
    },
  };
}
