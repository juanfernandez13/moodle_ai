import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Moodle AI — preparar cursos",
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
