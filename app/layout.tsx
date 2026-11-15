import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { THEME_BOOT } from "../src/client/theme.ts";
import "./globals.css";
import "./styles/shell.css";
import "./styles/entry.css";
import "./styles/editor.css";
import "./styles/tools.css";
import "./styles/students.css";
import "./styles/dates.css";
import "./styles/page-turn.css";

export const metadata: Metadata = {
  title: "Moodle IA — preparar disciplinas",
  description:
    "Prepare, revise e exporte disciplinas do Moodle com arquivos e atividades preservados.",
  icons: { icon: "/favicon.svg" },
};
// Diz ao navegador, antes de qualquer estilo, que a página tem claro e escuro: o fundo inicial já sai na cor certa.
export const viewport: Viewport = { colorScheme: "light dark" };
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // O script do <head> põe theme-dark ou theme-light no <html> antes do React; por isso o aviso de diferença é calado.
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
