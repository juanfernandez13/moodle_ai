import type { Metadata } from "next";
import { DatesWorkspace } from "../../src/client/features/dates/DatesWorkspace.tsx";

export const metadata: Metadata = { title: "Ajustar datas — Moodle IA" };

export default function DatesPage() {
  return <DatesWorkspace />;
}
