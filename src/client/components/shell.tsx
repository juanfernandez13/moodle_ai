"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  Moon,
  Sun,
  Users,
} from "lucide-react";
import {
  SYSTEM_DARK,
  THEME_KEY,
  resolveScheme,
  toggleScheme,
} from "../theme.ts";
import type { Scheme } from "../theme.ts";

/** Lê a preferência; com `value` grava, e com `null` apaga (a tela volta a seguir o sistema). */
function preference(key: string, value?: string | null): string | null {
  try {
    if (value === null) localStorage.removeItem(key);
    else if (value !== undefined) localStorage.setItem(key, value);
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** A marca fica no <html>, onde o script do <head> a põe antes da primeira pintura. */
function paint(scheme: Scheme) {
  const classes = document.documentElement.classList;
  classes.toggle("theme-dark", scheme === "dark");
  classes.toggle("theme-light", scheme === "light");
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

/**
 * Ao chegar a um controle com o Tab, o navegador nem sempre o mostra inteiro: num campo de texto ele só rola até o
 * cursor de digitação, e um controle que já aparece em parte (a última coluna de uma tabela larga, um campo alto
 * perto da borda de uma área que rola) fica metade escondido, com o anel de foco cortado. Depois do Tab o controle
 * inteiro aparece ("nearest" não mexe em nada se ele já está à vista, e deixa a folga do scroll-padding). Só vale para
 * o foco que o próprio Tab trouxe: o que a tela move por programa (abrir um passo, voltar à entrada) fica como está.
 */
function useRevealFocus() {
  useEffect(() => {
    let tabbing = false;
    const key = (event: KeyboardEvent) => {
      tabbing = event.key === "Tab";
    };
    const pointer = () => {
      tabbing = false;
    };
    const reveal = (event: FocusEvent) => {
      const control = event.target;
      if (!tabbing || !(control instanceof HTMLElement)) return;
      tabbing = false;
      control.scrollIntoView({ block: "nearest", inline: "nearest" });
    };
    window.addEventListener("keydown", key, true);
    window.addEventListener("pointerdown", pointer, true);
    document.addEventListener("focusin", reveal);
    return () => {
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("pointerdown", pointer, true);
      document.removeEventListener("focusin", reveal);
    };
  }, []);
}

const TABBABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

function tabbables(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(TABBABLE)).filter(
    (node) =>
      node.getClientRects().length > 0 &&
      !node.closest("[inert], .skip-link"),
  );
}

/**
 * Quem usa o teclado perde o foco quando o botão em que estava some ("Remover" uma atividade, uma questão, um aluno),
 * é desligado (a última página de uma lista) ou é trocado de lugar (subir ou descer um item): o foco cai no início da
 * página. Aqui ele volta para o mesmo botão, se ele ainda serve, ou passa para o vizinho mais perto dele (no fim da
 * lista, o que vem antes). Só age depois de teclado (Tab, Enter ou Espaço), só quando o foco foi mesmo parar no início
 * da página e espera um instante, para quem mudou a tela de propósito (abrir o editor, voltar à entrada, abrir uma
 * janela) levar o foco para onde quer. Um clique do mouse esquece o botão lembrado. Os botões que só esperam uma
 * resposta (enviar, preparar, gerar) não usam "disabled": ficam com aria-disabled e o foco nem sai deles.
 */
function useFocusRescue() {
  useEffect(() => {
    let byKeyboard = false;
    let last: {
      node: HTMLElement;
      family: HTMLElement | null;
      after: HTMLElement[];
      before: HTMLElement[];
    } | null = null;
    let timer = 0;
    const key = (event: KeyboardEvent) => {
      byKeyboard =
        event.key === "Enter" || event.key === " " || event.key === "Tab";
    };
    // Quem passou a usar o mouse não quer ser "resgatado": o botão lembrado é esquecido, para um clique em área vazia (que
    // tira o foco de um controle) não fazer o foco voltar a ele quando a tela mudar por outro motivo.
    const pointer = () => {
      byKeyboard = false;
      last = null;
      window.clearTimeout(timer);
      timer = 0;
    };
    const remember = (event: FocusEvent) => {
      const node = event.target;
      if (!(node instanceof HTMLElement) || !byKeyboard) {
        last = null;
        return;
      }
      const list = tabbables();
      const index = list.indexOf(node);
      last =
        index < 0
          ? null
          : {
              node,
              family: node.parentElement,
              after: list.slice(index + 1, index + 9),
              before: list.slice(Math.max(0, index - 8), index).reverse(),
            };
    };
    const usable = (node: HTMLElement) =>
      node.isConnected &&
      node.getClientRects().length > 0 &&
      !("disabled" in node && node.disabled) &&
      !node.closest("[inert], [hidden]");
    const check = () => {
      timer = 0;
      const lost = last;
      if (!lost) return;
      if (document.activeElement && document.activeElement !== document.body)
        return;
      if (document.querySelector("dialog[open]")) return;
      // O mesmo botão, se ainda serve; senão o vizinho mais perto dele (o outro botão do par); senão o que vem depois, ou antes.
      const near = [...lost.after, ...lost.before].filter(usable);
      const inFamily = near.filter((node) => lost.family?.contains(node));
      const fresh = lost.family?.isConnected
        ? Array.from(lost.family.querySelectorAll<HTMLElement>(TABBABLE)).filter(
            usable,
          )
        : [];
      const target = usable(lost.node)
        ? lost.node
        : (inFamily[0] ?? fresh[0] ?? near[0]);
      last = null;
      target?.focus();
    };
    // O navegador só tira o foco de um botão desligado na pintura seguinte: por isso a conferência é adiada
    // (sempre que algo muda e há um botão lembrado), e só então se olha onde o foco está.
    const observer = new MutationObserver(() => {
      if (last && !timer) timer = window.setTimeout(check, 80);
    });
    window.addEventListener("keydown", key, true);
    window.addEventListener("pointerdown", pointer, true);
    document.addEventListener("focusin", remember);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled", "hidden", "aria-disabled"],
    });
    return () => {
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("pointerdown", pointer, true);
      document.removeEventListener("focusin", remember);
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, []);
}

type Tool = "course" | "students" | "dates";
const TOOLS = [
  ["course", "/", "Disciplina", BookOpen],
  ["students", "/cadastro-lote", "Alunos", Users],
  ["dates", "/datas", "Datas", CalendarDays],
] as const;

/**
 * As três ferramentas num botão só: ele mostra onde a pessoa está e abre a lista das outras.
 * É um botão que mostra e esconde uma lista de links (não um "menu" de aplicativo): Tab passa pelos links,
 * Esc fecha e devolve o foco ao botão, e um clique fora ou o foco saindo dali também fecha.
 */
function ToolMenu({ active }: { active: Tool }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const listId = useId();
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !box.current?.contains(event.target))
        setOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    window.addEventListener("pointerdown", outside);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", outside);
      window.removeEventListener("keydown", key);
    };
  }, [open]);
  const current = TOOLS.find(([id]) => id === active) ?? TOOLS[0];
  const CurrentIcon = current[3];
  return (
    <div
      className="header-menu"
      ref={box}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        ref={button}
        className="header-action header-menu-button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen(!open)}
      >
        <CurrentIcon size={20} aria-hidden="true" />
        {current[2]}
        <ChevronDown
          className="header-menu-chevron"
          size={18}
          aria-hidden="true"
        />
      </button>
      <ul id={listId} className="header-menu-list" hidden={!open}>
        {TOOLS.map(([id, href, label, Icon]) => (
          <li key={id}>
            <Link
              href={href}
              className="header-menu-item"
              aria-current={active === id ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              <Icon size={20} aria-hidden="true" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Shell({
  children,
  active = "course",
}: {
  children: ReactNode;
  active?: Tool;
}) {
  const [dark, setDark] = useState(false);
  const main = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // O sistema pode trocar de claro para escuro a qualquer hora (muitos trocam ao anoitecer), e a escolha pode mudar
    // em outra aba: nos dois casos a tela acompanha.
    const system = matchMedia(SYSTEM_DARK);
    const follow = () => {
      const scheme = resolveScheme(preference(THEME_KEY), system.matches);
      paint(scheme);
      setDark(scheme === "dark");
    };
    const stored = (event: StorageEvent) => {
      if (event.key === THEME_KEY || event.key === null) follow();
    };
    follow();
    system.addEventListener("change", follow);
    window.addEventListener("storage", stored);
    return () => {
      system.removeEventListener("change", follow);
      window.removeEventListener("storage", stored);
    };
  }, []);
  useKeyboardScroll(main);
  useRevealFocus();
  useFocusRescue();
  return (
    <div className="application">
      {/* Pular para o conteúdo: aparece só quando o teclado chega nele. O foco vai para o título da página. */}
      <a
        className="skip-link"
        href="#conteudo"
        onClick={(event) => {
          event.preventDefault();
          const heading = document.querySelector<HTMLElement>("main h1");
          if (!heading) return;
          heading.tabIndex = -1;
          heading.focus();
        }}
      >
        Ir para o conteúdo
      </a>
      <div className="workspace">
        <header className="topbar">
          <Link className="brand" href="/">
            <img src="/brand-owl-mark.svg" width="34" height="34" alt="" />
            Moodle IA
          </Link>
          <nav className="header-actions" aria-label="Menu">
            <ToolMenu active={active} />
            {/* O botão diz o que faz: "Escuro" enquanto a tela é clara, "Claro" enquanto é escura ("Tema" parece o assunto de uma aula). */}
            <button
              type="button"
              className="header-action header-theme"
              aria-label={dark ? "Mudar para o tema claro" : "Mudar para o tema escuro"}
              onClick={() => {
                const next = toggleScheme(
                  dark ? "dark" : "light",
                  matchMedia(SYSTEM_DARK).matches,
                );
                preference(THEME_KEY, next.store);
                paint(next.scheme);
                setDark(next.scheme === "dark");
              }}
            >
              {/* As duas opções vão no HTML; a folha de estilos mostra só a que vale (ver shell.css). */}
              <span className="header-theme-option" data-to="dark">
                <Moon size={20} aria-hidden="true" />
                <span className="header-theme-word">Escuro</span>
              </span>
              <span className="header-theme-option" data-to="light">
                <Sun size={20} aria-hidden="true" />
                <span className="header-theme-word">Claro</span>
              </span>
            </button>
          </nav>
        </header>
        <div className="workspace-main" ref={main}>
          {/* Destino do link "Ir para o conteúdo" (sem JavaScript o navegador pousa aqui; com JavaScript o foco vai ao título). */}
          <div id="conteudo" className="skip-target" tabIndex={-1} />
          {children}
        </div>
      </div>
    </div>
  );
}
