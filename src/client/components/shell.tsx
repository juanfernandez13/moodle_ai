"use client";
import Link from "next/link";
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import InteractiveBackground from "../../visual/background/InteractiveBackground";
import {
  Users,
  Image as LandscapeIcon,
  Moon,
  Sun,
  CalendarDays,
} from "lucide-react";

const ThemeContext = createContext<"light" | "dark">("light");
export function useTheme(): "light" | "dark" {
  return useContext(ThemeContext);
}

function preference(key: string, value?: string): string | null {
  try {
    if (value !== undefined) localStorage.setItem(key, value);
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function Shell({
  children,
  active = "course",
}: {
  children: ReactNode;
  active?: "course" | "students" | "dates";
}) {
  const [dark, setDark] = useState(false);
  const [scene, setScene] = useState(true);
  useEffect(() => {
    setDark(preference("moodle-ai-theme") === "dark");
    setScene(preference("moodle-ai-scene") !== "off");
  }, []);
  return (
    <ThemeContext.Provider value={dark ? "dark" : "light"}>
      <div
        className={`application ${dark ? "theme-dark" : "theme-light"} ${scene ? "scene-on" : "scene-off"}`}
      >
        <InteractiveBackground
          enabled={scene}
          theme={dark ? "dark" : "light"}
        />
        <div className={`workspace${active === "students" ? " workspace-students" : ""}`}>
          <header className="topbar">
            <Link className="brand" href="/">
              <img src="/brand-owl.svg" width="39" height="39" alt="" />
              <span>
                Moodle<span className="brand-ai"> AI</span>
              </span>
            </Link>
            <nav
              className="header-actions"
              aria-label="Ferramentas e aparência"
            >
              <Link
                href="/cadastro-lote"
                className="header-action"
                aria-current={active === "students" ? "page" : undefined}
              >
                <Users size={19} />
                Alunos
              </Link>
              <Link
                href="/datas"
                className="header-action dates-link"
                aria-current={active === "dates" ? "page" : undefined}
              >
                <CalendarDays size={19} />
                Datas
              </Link>
              <button
                type="button"
                className="header-action"
                aria-pressed={scene}
                onClick={() => {
                  setScene(!scene);
                  preference("moodle-ai-scene", scene ? "off" : "on");
                }}
              >
                <LandscapeIcon size={19} />
                Fundo
              </button>
              <button
                type="button"
                className="header-action"
                aria-pressed={dark}
                onClick={() => {
                  setDark(!dark);
                  preference("moodle-ai-theme", dark ? "light" : "dark");
                }}
              >
                {dark ? <Sun size={19} /> : <Moon size={19} />}Tema
              </button>
            </nav>
          </header>
          {children}
          <footer className="app-footer">
            Feito para preparar, revisar e levar seu curso ao Moodle.
          </footer>
        </div>
      </div>
    </ThemeContext.Provider>
  );
}

export function Owl() {
  return (
    <svg className="owl" viewBox="0 0 200 200" aria-hidden="true">
      <g stroke="#765334" strokeWidth="1.5" strokeLinejoin="round">
        <ellipse cx="100" cy="117" rx="55" ry="68" fill="#b89060" />
        <path d="m49 80-9-35 34 19m52 0 34-19-9 35" fill="#b89060" />
        <ellipse cx="45" cy="130" rx="12" ry="40" fill="#9f794c" />
        <ellipse cx="155" cy="130" rx="12" ry="40" fill="#9f794c" />
        <ellipse cx="100" cy="153" rx="26" ry="31" fill="#ead4a9" />
        <circle cx="75" cy="96" r="25" fill="#fffaf0" />
        <circle cx="125" cy="96" r="25" fill="#fffaf0" />
      </g>
      <g fill="#38a66b" stroke="#226542" strokeWidth="2">
        <circle cx="76" cy="97" r="15" />
        <circle cx="124" cy="97" r="15" />
      </g>
      <g fill="#182219">
        <circle cx="76" cy="97" r="8" />
        <circle cx="124" cy="97" r="8" />
      </g>
      <g fill="#fff">
        <circle cx="72" cy="92" r="4" />
        <circle cx="120" cy="92" r="4" />
      </g>
      <path
        d="M94 120Q100 113 106 120L100 134Z"
        fill="#cea85d"
        stroke="#886332"
      />
      <path d="M66 40h68v23q-34-6-68 0Z" fill="#17191c" />
      <path d="m31 35 69-28 69 28-69-27Z" fill="#17191c" />
      <path d="M100 36 56 45v33" fill="none" stroke="#e4bd45" strokeWidth="4" />
      <path d="m53 77-2 12h10l-2-12" fill="#e4bd45" />
      <image href="/moodle-mark.svg" x="81" y="139" width="38" height="27" />
    </svg>
  );
}
