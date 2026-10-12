import type { StudentOptions, StudentRow } from "../../../domain/students/index.ts";

export const STUDENT_PAGE_SIZE = 10;
export const studentFields = [
  ["fullName", "Nome completo"], ["firstName", "Primeiro nome"],
  ["lastName", "Sobrenome"], ["email", "E-mail"], ["username", "Usuário"],
  ["cpf", "CPF"], ["course", "Curso"],
] as const;
export const editableStudentFields = ["username", "firstName", "lastName", "email", "cpf", "course"] as const;
export type StudentEditField = typeof editableStudentFields[number];
export const studentFieldLabels: Record<StudentEditField, string> = {
  username: "usuário",
  firstName: "primeiro nome",
  lastName: "sobrenome",
  email: "e-mail",
  cpf: "CPF",
  course: "curso",
};

export function createStudentExample() {
  return [
    ["Nome completo", "E-mail", "CPF", "Curso"],
    ["Ana Lima", "ana@example.org", "", "PROG-2026"],
    ["Bruno Costa", "bruno@", "", "PROG-2026"],
  ];
}

/** Course overrides create independent batches; the edited source stays intact. */
export function buildStudentBatches(rows: StudentRow[], options: StudentOptions, destinations: string) {
  const courses = [...new Set(destinations.split(/[,;\n]/).map((value) => value.trim()).filter(Boolean))];
  return options.enrol && courses.length
    ? courses.map((course) => rows.map((row) => ({ ...row, course })))
    : [rows];
}

export function studentPage<T>(rows: T[], page: number): T[] {
  return rows.slice(page * STUDENT_PAGE_SIZE, (page + 1) * STUDENT_PAGE_SIZE);
}
