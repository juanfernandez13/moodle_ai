import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./styles/shell.css";
import "./styles/entry.css";
import "./styles/editor.css";
import "./styles/tools.css";
import "./styles/students.css";
import "./styles/dates.css";
import "./styles/page-turn.css";

export const metadata: Metadata = {
  title: "Moodle IA — preparar cursos",
  description:
    "Prepare, revise e exporte cursos Moodle com arquivos e atividades preservados.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
