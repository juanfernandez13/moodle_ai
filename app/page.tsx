import type { Metadata } from "next";
import { CourseBuilder } from "../src/client/features/course/course-builder.tsx";

export const metadata: Metadata = { title: "Criar disciplina — Moodle IA" };

export default function Home() {
  return <CourseBuilder />;
}
