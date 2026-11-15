import type { StudentIssue, StudentOptions, StudentRow } from "../../../domain/students/index.ts";

export const STUDENT_PAGE_SIZE = 10;
export const studentFields = [
  ["fullName", "Nome completo"], ["firstName", "Primeiro nome"],
  ["lastName", "Sobrenome"], ["email", "E-mail"], ["username", "Usuário"],
  ["cpf", "CPF"], ["course", "Disciplina"],
] as const;
/** In the order of the review table: the CPF first (it is the login), then the name, the e-mail and the course. */
export const editableStudentFields = ["cpf", "firstName", "lastName", "email", "course", "username"] as const;
export type StudentEditField = typeof editableStudentFields[number];
export const studentFieldLabels: Record<StudentEditField, string> = {
  username: "usuário",
  firstName: "primeiro nome",
  lastName: "sobrenome",
  email: "e-mail",
  cpf: "CPF",
  course: "disciplina",
};

/** The columns of the example spreadsheet. The typed table, the template file and the example share them. */
export const manualStudentFields = [
  ["fullName", "Nome completo"],
  ["email", "E-mail"],
  ["cpf", "CPF"],
  ["course", "Disciplina"],
] as const;
export type ManualStudentField = typeof manualStudentFields[number][0];
export type ManualStudent = { id: number } & Record<ManualStudentField, string>;
export const studentSheetColumns: string[] = manualStudentFields.map(([, label]) => label);
/** One student can be typed per row; a longer class belongs in a spreadsheet. */
export const MANUAL_STUDENT_LIMIT = 200;
export const MANUAL_STUDENT_ROWS = 3;

export function createStudentExample() {
  return [
    [...studentSheetColumns],
    ["Ana Lima", "ana@example.org", "", "PROG-2026"],
    ["Bruno Costa", "bruno@", "", "PROG-2026"],
  ];
}

/** An empty spreadsheet with the example columns, in the Brazilian Excel format: semicolons and a BOM so accents open right. */
export function createStudentTemplate(): Uint8Array {
  return new TextEncoder().encode(`﻿${studentSheetColumns.join(";")}\r\n`);
}

export function emptyManualStudent(id: number): ManualStudent {
  return { id, fullName: "", email: "", cpf: "", course: "" };
}

/** Typed rows become the matrix the example uses: a header row and one row per student. Rows with nothing typed are ignored. */
export function manualStudentsToMatrix(students: readonly ManualStudent[]): string[][] {
  const filled = students.filter((student) =>
    manualStudentFields.some(([field]) => student[field].trim()),
  );
  return [
    [...studentSheetColumns],
    ...filled.map((student) =>
      manualStudentFields.map(([field]) => student[field].trim()),
    ),
  ];
}

/** Course codes typed once for the whole batch (comma, semicolon or line break), without repeats. */
export function studentCourses(destinations: string): string[] {
  return [...new Set(destinations.split(/[,;\n]/).map((value) => value.trim()).filter(Boolean))];
}

/** Course overrides create independent batches; the edited source stays intact. */
export function buildStudentBatches(rows: StudentRow[], options: StudentOptions, destinations: string) {
  const courses = studentCourses(destinations);
  return options.enrol && courses.length
    ? courses.map((course) => rows.map((row) => ({ ...row, course })))
    : [rows];
}

/** Rows that would fail enrolment because no course is typed for the batch and none is in the row. */
export function studentCourseGaps(rows: StudentRow[], options: StudentOptions, destinations: string): StudentIssue[] {
  if (!options.enrol || studentCourses(destinations).length) return [];
  return rows.flatMap((row, index) =>
    row.course.trim()
      ? []
      : [{ code: "required_course", path: `rows[${index}].course`, rowId: row.id, message: "Informe a disciplina." }],
  );
}

/**
 * What the teacher reads when a spreadsheet is refused; the server messages that carry jargon are rewritten.
 * `lines` is how many rows the server found, which tells an empty file from one with unknown columns.
 */
export function friendlyParseMessage(
  issue: { code?: string; message: string },
  lines?: number,
): string {
  if (issue.code === "formula_cell")
    return "A planilha tem fórmulas. Copie como valores e tente de novo.";
  if (issue.message.startsWith("Cabeçalho não reconhecido"))
    return "Não reconhecemos as colunas. Escolha qual é qual.";
  if (issue.message.startsWith("Use até 10.000 alunos") && lines !== undefined && lines <= 1)
    return lines === 0
      ? "A planilha está vazia."
      : "Não encontramos alunos. Confira os títulos.";
  return issue.message;
}

/** The preview rows carry a sentence from the server; the table shows one word. */
export function previewStatusLabel(status: string): string {
  if (/pend[eê]ncia/i.test(status)) return "Pendência";
  if (/^revisado/i.test(status)) return "Pronto";
  return status;
}

export function studentPage<T>(rows: T[], page: number, size: number = STUDENT_PAGE_SIZE): T[] {
  return rows.slice(page * size, (page + 1) * size);
}

/** The review table never shows fewer than this many students per page, even when the window is too low for them. */
export const STUDENT_MIN_PAGE_SIZE = 3;

/**
 * How many students of the review table fit in `space` pixels (what is left of the window after everything else on
 * the screen), `rowHeight` pixels each. Between the minimum and the ten of a full page: so a page is always seen
 * whole, with no scroll inside the table.
 */
export function studentRowsThatFit(space: number, rowHeight: number): number {
  if (!Number.isFinite(space) || !Number.isFinite(rowHeight) || rowHeight <= 0) return STUDENT_PAGE_SIZE;
  return Math.max(STUDENT_MIN_PAGE_SIZE, Math.min(STUDENT_PAGE_SIZE, Math.floor(space / rowHeight)));
}

/** After the page size changed, the page that still shows the first student the person was looking at. */
export function studentPageAfterResize(page: number, oldSize: number, newSize: number): number {
  return Math.floor((page * oldSize) / newSize);
}
