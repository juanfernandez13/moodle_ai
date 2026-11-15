"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode, Ref } from "react";
import { Check, ChevronDown } from "lucide-react";

export type DropdownOption<T extends string> = {
  value: T;
  label: string;
  /** Um detalhe curto ao lado do nome ("chave desta aba"). */
  hint?: string | undefined;
};
/** Uma ação no fim da lista ("Adicionar chave…"): não vira o valor escolhido. */
export type DropdownAction = {
  id: string;
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
};

type Item<T extends string> =
  | { kind: "option"; id: string; option: DropdownOption<T> }
  | { kind: "action"; id: string; action: DropdownAction };

/** Sem posicionamento por âncora no CSS, a lista é posta abaixo (ou acima) do botão por aqui. */
function place(button: HTMLElement, list: HTMLElement) {
  const box = button.getBoundingClientRect();
  const gap = 4;
  list.style.minWidth = `${box.width}px`;
  const height = list.offsetHeight;
  const below = window.innerHeight - box.bottom;
  const top =
    below < height + gap + 8 && box.top > below
      ? Math.max(8, box.top - gap - height)
      : box.bottom + gap;
  const left = Math.max(
    8,
    Math.min(box.left, window.innerWidth - list.offsetWidth - 8),
  );
  list.style.top = `${top}px`;
  list.style.left = `${left}px`;
}

/**
 * Lista de escolha com o desenho do app, no lugar do <select> do sistema. O botão mostra o valor e abre a lista
 * (popover: fica por cima de tudo, fecha com Esc e com um clique fora). O foco fica no botão; as setas andam pela
 * lista, Enter ou Espaço escolhem, Home e End vão às pontas, uma letra pula para a opção que começa com ela e o Tab
 * fecha. Para o leitor de tela é uma caixa de combinação só de escolha (combobox + listbox).
 */
export function Dropdown<T extends string>({
  id,
  value,
  options,
  onChange,
  actions = [],
  placeholder = "Escolha",
  label,
  labelledBy,
  describedBy,
  invalid,
  disabled,
  className,
  buttonRef,
}: {
  id?: string | undefined;
  value: T | null;
  options: readonly DropdownOption<T>[];
  onChange: (value: T) => void;
  actions?: readonly DropdownAction[];
  placeholder?: string;
  /** Nome para o leitor de tela quando não há <label htmlFor> nem `labelledBy`. */
  label?: string | undefined;
  labelledBy?: string | undefined;
  describedBy?: string | undefined;
  invalid?: boolean | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
  buttonRef?: Ref<HTMLButtonElement> | undefined;
}) {
  const own = useId();
  const buttonId = id ?? `${own}-button`;
  const listId = `${own}-list`;
  const anchor = `--dropdown-${own.replace(/[^a-zA-Z0-9]/g, "")}`;
  const button = useRef<HTMLButtonElement | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // O clique fora fecha a lista antes de o clique chegar ao botão: sem lembrar disso, o mesmo clique a reabriria.
  const wasOpen = useRef(false);
  const typed = useRef({ text: "", at: 0 });

  const items: Item<T>[] = [
    ...options.map(
      (option, index): Item<T> => ({
        kind: "option",
        id: `${own}-option-${index}`,
        option,
      }),
    ),
    ...actions.map(
      (action): Item<T> => ({
        kind: "action",
        id: `${own}-action-${action.id}`,
        action,
      }),
    ),
  ];
  const selected = options.find((option) => option.value === value) ?? null;
  const selectedIndex = selected ? options.indexOf(selected) : -1;

  // O navegador é quem abre e fecha (Esc, clique fora): o estado daqui só acompanha.
  useEffect(() => {
    const node = list.current;
    if (!node) return;
    const sync = (event: Event) =>
      setOpen((event as ToggleEvent).newState === "open");
    node.addEventListener("toggle", sync);
    return () => node.removeEventListener("toggle", sync);
  }, []);

  // Navegador sem âncora no CSS: a posição é calculada ao abrir e refeita quando a página rola ou muda de tamanho.
  useEffect(() => {
    if (!open) return;
    const node = list.current;
    const trigger = button.current;
    if (!node || !trigger) return;
    if (CSS.supports("position-area", "block-end")) return;
    node.dataset.placed = "script";
    const update = () => place(trigger, node);
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  // A opção ativa aparece inteira quando a lista é comprida.
  useEffect(() => {
    if (!open || active < 0) return;
    list.current
      ?.querySelector("[data-active]")
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function show(start = selectedIndex >= 0 ? selectedIndex : 0) {
    const node = list.current;
    if (!node || disabled || items.length === 0) return;
    setActive(Math.min(start, items.length - 1));
    if (!node.matches(":popover-open")) node.showPopover();
  }
  function hide() {
    const node = list.current;
    if (node?.matches(":popover-open")) node.hidePopover();
  }
  function choose(item: Item<T> | undefined) {
    if (!item) return;
    hide();
    if (item.kind === "option") {
      if (item.option.value !== value) onChange(item.option.value);
    } else item.action.onSelect();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const last = items.length - 1;
    const key = event.key;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(key)) {
        event.preventDefault();
        show();
      } else if (key.length === 1 && key !== " ") typeahead(key, true);
      return;
    }
    if (key === "ArrowDown") setActive(Math.min(last, active + 1));
    else if (key === "ArrowUp") setActive(Math.max(0, active - 1));
    else if (key === "Home") setActive(0);
    else if (key === "End") setActive(last);
    else if (key === "Enter" || key === " ") choose(items[active]);
    else if (key === "Tab") {
      // O Tab segue o caminho dele; a lista só fecha.
      hide();
      return;
    } else if (key.length === 1) typeahead(key, false);
    else return;
    event.preventDefault();
  }

  /** Uma letra (ou várias seguidas, em menos de meio segundo) pula para a opção que começa com elas. */
  function typeahead(key: string, opening: boolean) {
    const now = Date.now();
    const text =
      now - typed.current.at < 500 ? typed.current.text + key : key;
    typed.current = { text, at: now };
    const index = items.findIndex(
      (item) =>
        item.kind === "option" &&
        item.option.label.toLowerCase().startsWith(text.toLowerCase()),
    );
    if (index < 0) return;
    if (opening) show(index);
    else setActive(index);
  }

  const activeId = open && active >= 0 ? items[active]?.id : undefined;

  return (
    <div className={`dropdown${className ? ` ${className}` : ""}`}>
      <button
        type="button"
        id={buttonId}
        ref={(node) => {
          button.current = node;
          if (typeof buttonRef === "function") buttonRef(node);
          else if (buttonRef) buttonRef.current = node;
        }}
        className="dropdown-button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={activeId}
        aria-label={label}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-invalid={invalid ? true : undefined}
        disabled={disabled}
        style={{ anchorName: anchor } as CSSProperties}
        onPointerDown={() => {
          wasOpen.current = open;
        }}
        onClick={(event) => {
          // detail 0: o clique veio do teclado, que já é tratado em onKeyDown.
          if (event.detail === 0) return;
          if (wasOpen.current) hide();
          else show();
        }}
        onKeyDown={onKeyDown}
        onBlur={hide}
      >
        <span className="dropdown-value" data-empty={selected ? undefined : ""}>
          {selected ? (
            <>
              {selected.label}
              {selected.hint && (
                <span className="dropdown-hint"> · {selected.hint}</span>
              )}
            </>
          ) : (
            placeholder
          )}
        </span>
        <ChevronDown className="dropdown-chevron" size={16} aria-hidden="true" />
      </button>
      <div
        ref={list}
        id={listId}
        className="dropdown-list"
        role="listbox"
        aria-labelledby={labelledBy ?? buttonId}
        popover="auto"
        style={{ positionAnchor: anchor } as CSSProperties}
        // O clique numa opção não tira o foco do botão.
        onPointerDown={(event) => event.preventDefault()}
      >
        {items.map((item, index) => (
          <div
            key={item.id}
            id={item.id}
            role="option"
            className="dropdown-option"
            aria-selected={item.kind === "option" && item.option.value === value}
            data-active={index === active ? "" : undefined}
            data-action={item.kind === "action" ? "" : undefined}
            data-first-action={
              item.kind === "action" && index === options.length && index > 0
                ? ""
                : undefined
            }
            onPointerMove={() => setActive(index)}
            onClick={() => choose(item)}
          >
            <span className="dropdown-mark" aria-hidden="true">
              {item.kind === "action" ? (
                item.action.icon
              ) : item.option.value === value ? (
                <Check size={16} />
              ) : null}
            </span>
            <span className="dropdown-label">
              {item.kind === "action" ? item.action.label : item.option.label}
            </span>
            {item.kind === "option" && item.option.hint && (
              <span className="dropdown-hint">{item.option.hint}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
