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
    username: locate("username", "usuario", "login"),
    cpf: locate("cpf", "idnumber"),
    course: locate("curso", "course", "course1"),
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
    const field = (column: number) =>
      column < 0 ? "" : String(values[column] ?? "");
    const parts = field(columns.full).trim().split(/\s+/);
    const email = field(columns.email);
    return {
      id: `row-${index + start + 1}`,
      rowNumber: index + start + 1,
      original: Object.fromEntries(
        headers.map((header, column) => [header, String(values[column] ?? "")]),
      ),
      firstName: columns.first < 0 ? (parts[0] ?? "") : field(columns.first),
      lastName:
        columns.last < 0 ? parts.slice(1).join(" ") : field(columns.last),
      email,
      username:
        columns.username < 0
          ? (email.split("@")[0] ?? "")
          : field(columns.username),
      cpf: field(columns.cpf),
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
export function validateStudents(rows: readonly StudentRow[]): {
  valid: boolean;
  issues: StudentIssue[];
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
    };
  const issues: StudentIssue[] = [];
  const seen = {
    id: new Set<string>(),
    email: new Set<string>(),
    username: new Set<string>(),
    cpf: new Set<string>(),
  };
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
    if (!row.firstName.trim())
      add("required_name", "firstName", "Preencha o primeiro nome.");
    if (!row.lastName.trim())
      add("required_name", "lastName", "Preencha o sobrenome.");
    if (!z.email().safeParse(row.email).success)
      add("invalid_email", "email", "Informe um e-mail válido.");
    if (row.cpf.trim() && !validCpf(row.cpf))
      add("invalid_cpf", "cpf", "Confira os dígitos do CPF.");
    for (const field of ["id", "email", "username", "cpf"] as const) {
      const value =
        field === "cpf"
          ? row.cpf.replace(/[.\-\s]/g, "")
          : row[field].toLowerCase();
      if (!value) continue;
      if (seen[field].has(value))
        add(
          `duplicate_${field}`,
          field,
          "Este valor já aparece em outra linha.",
        );
      seen[field].add(value);
    }
  });
  return { valid: issues.length === 0, issues };
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
          message: "Informe o nome curto do curso para matrícula.",
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
  const copied = structuredClone([...rows]);
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
    new TextEncoder().encode(JSON.stringify({ rows: copied, options, csv })),
  );
  return {
    ok: true,
    preview: {
      hash,
      csv,
      count: copied.length,
      rows: copied,
      options: structuredClone(options),
    },
  };
}
