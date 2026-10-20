"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { Users, Moon, Sun, CalendarDays } from "lucide-react";

function preference(key: string, value?: string): string | null {
  try {
    if (value !== undefined) localStorage.setItem(key, value);
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

const SCROLL_KEYS = new Set([
  "PageDown",
  "PageUp",
  "Home",
  "End",
  " ",
  "ArrowDown",
  "ArrowUp",
]);

/** Área com barra de rolagem vertical (tem mais conteúdo do que cabe), em qualquer direção. */
function scrolls(element: HTMLElement): boolean {
  if (element.scrollHeight <= element.clientHeight + 1) return false;
  const overflow = getComputedStyle(element).overflowY;
  return overflow === "auto" || overflow === "scroll";
}

function canScroll(element: HTMLElement, down: boolean): boolean {
  if (!scrolls(element)) return false;
  return down
    ? element.scrollTop + element.clientHeight < element.scrollHeight - 1
    : element.scrollTop > 0;
}

/** A maior área de rolagem (a própria região ou uma coluna dentro dela) que ainda rola nessa direção. */
function mainArea(region: HTMLElement, down: boolean): HTMLElement | null {
  let best: HTMLElement | null = null;
  let bestSize = 0;
  for (const element of [
    region,
    ...region.querySelectorAll<HTMLElement>("*"),
  ]) {
    if (
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    )
      continue;
    if (!canScroll(element, down)) continue;
    const size = element.clientWidth * element.clientHeight;
    if (size > bestSize) {
      best = element;
      bestSize = size;
    }
  }
  return best;
}

/**
 * Nas telas de altura fixa a página não rola: as colunas rolam por dentro. O Chrome só rola uma
 * coluna pelo teclado depois de um clique nela, então PageDown, Espaço e as setas não fazem nada
 * logo que a tela abre. Só nesse caso (nada em foco, a página não rola e o clique não foi dentro de
 * uma coluna) a coluna principal rola aqui. Foco e ordem do Tab não mudam, e tudo o que o navegador
 * já faz sozinho continua com ele.
 */
function useKeyboardScroll(region: RefObject<HTMLElement | null>) {
  useEffect(() => {
    let pressed: Element | null = null;
    const remember = (event: PointerEvent) => {
      pressed = event.target instanceof Element ? event.target : null;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const root = region.current;
      if (!root || event.defaultPrevented || event.isComposing) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (!SCROLL_KEYS.has(event.key)) return;
      if (event.shiftKey && event.key !== " ") return;
      if (document.activeElement && document.activeElement !== document.body)
        return;
      if (document.querySelector("dialog[open]")) return;
      const page = document.scrollingElement;
      if (page && page.scrollHeight > page.clientHeight + 1) return;
      for (let node = pressed; node; node = node.parentElement) {
        if (node instanceof HTMLElement && scrolls(node)) return;
      }
      const down =
        event.key === " "
          ? !event.shiftKey
          : event.key === "PageDown" ||
            event.key === "End" ||
            event.key === "ArrowDown";
      const area = mainArea(root, down);
      if (!area) return;
      const behavior = matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth";
      if (event.key === "Home") area.scrollTo({ top: 0, behavior });
      else if (event.key === "End")
        area.scrollTo({ top: area.scrollHeight, behavior });
      else {
        const step = event.key.startsWith("Arrow")
          ? 40
          : Math.max(area.clientHeight * 0.875, area.clientHeight - 40);
        area.scrollBy({ top: down ? step : -step, behavior });
      }
      event.preventDefault();
    };
    window.addEventListener("pointerdown", remember, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", remember, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [region]);
}

export function Shell({
  children,
  active = "course",
}: {
  children: ReactNode;
  active?: "course" | "students" | "dates";
}) {
  const [dark, setDark] = useState(false);
  const main = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setDark(preference("moodle-ai-theme") === "dark");
  }, []);
  useKeyboardScroll(main);
  return (
    <div className={`application ${dark ? "theme-dark" : "theme-light"}`}>
      <div className="workspace">
        <header className="topbar">
          <Link className="brand" href="/">
            <img src="/brand-owl-mark.svg" width="34" height="34" alt="" />
            Moodle IA
          </Link>
          <nav className="header-actions" aria-label="Menu">
            <Link
              href="/cadastro-lote"
              className="header-action"
              aria-current={active === "students" ? "page" : undefined}
            >
              <Users size={20} aria-hidden="true" />
              Alunos
            </Link>
            <Link
              href="/datas"
              className="header-action dates-link"
              aria-current={active === "dates" ? "page" : undefined}
            >
              <CalendarDays size={20} aria-hidden="true" />
              Datas
            </Link>
            <button
              type="button"
              className="header-action"
              aria-label="Tema escuro"
              aria-pressed={dark}
              onClick={() => {
                setDark(!dark);
                preference("moodle-ai-theme", dark ? "light" : "dark");
              }}
            >
              {dark ? (
                <Sun size={20} aria-hidden="true" />
              ) : (
                <Moon size={20} aria-hidden="true" />
              )}
              Tema
            </button>
          </nav>
        </header>
        <div className="workspace-main" ref={main}>
          {children}
        </div>
      </div>
    </div>
  );
}
