"use client";
import { useRef } from "react";
import type { KeyboardEvent } from "react";

export type PanelTab = { id: string; label: string };

const tabButtonId = (base: string, id: string) => `${base}-tab-${id}`;
const tabPanelId = (base: string, id: string) => `${base}-panel-${id}`;

/**
 * The props of the panel a tab opens. Every panel stays in the page; the ones that are not open are hidden, so a tab
 * can always point at its panel.
 */
export function tabPanelProps(base: string, id: string, value: string) {
  return {
    id: tabPanelId(base, id),
    role: "tabpanel" as const,
    "aria-labelledby": tabButtonId(base, id),
    hidden: value !== id,
  };
}

/**
 * Tabs of a panel (Conteúdo, Configuração e datas, Anexos...). Only the open tab takes the Tab key; the arrow keys,
 * Home and End move between the tabs and open them. `base` ties the tabs to their panels (see `tabPanelProps`).
 */
export function PanelTabs({
  base,
  label,
  tabs,
  value,
  onChange,
  compact = false,
}: {
  base: string;
  label: string;
  tabs: PanelTab[];
  value: string;
  onChange: (id: string) => void;
  compact?: boolean;
}) {
  const list = useRef<HTMLDivElement>(null);
  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = tabs.length - 1;
    const target =
      event.key === "ArrowRight"
        ? index === last
          ? 0
          : index + 1
        : event.key === "ArrowLeft"
          ? index === 0
            ? last
            : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : -1;
    if (target < 0) return;
    event.preventDefault();
    onChange(tabs[target]!.id);
    list.current
      ?.querySelectorAll<HTMLElement>('[role="tab"]')
      [target]?.focus();
  }
  return (
    <div
      ref={list}
      className={compact ? "panel-tabs compact" : "panel-tabs"}
      role="tablist"
      aria-label={label}
    >
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          id={tabButtonId(base, tab.id)}
          aria-selected={value === tab.id}
          aria-controls={tabPanelId(base, tab.id)}
          tabIndex={value === tab.id ? 0 : -1}
          onKeyDown={(event) => move(event, index)}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
