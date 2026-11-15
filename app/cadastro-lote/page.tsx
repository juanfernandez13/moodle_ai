import type { Metadata } from "next";
import { StudentsWorkspace } from "../../src/client/features/students/StudentsWorkspace.tsx";

export const metadata: Metadata = { title: "Cadastrar alunos — Moodle IA" };

export default function StudentsPage() {
  return <StudentsWorkspace />;
}
