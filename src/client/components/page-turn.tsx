"use client";
import { createElement, useEffect, useState } from "react";
import type { HTMLAttributes, ReactNode, Ref } from "react";

/**
 * PageTurn: when the step changes, the new step slides a few pixels into place and fades in: going forward it comes
 * from the right, going back from the left. Only the step area moves: header, steps and background stay where they
 * are. (It used to be a 600ms 3D page flip; a short slide reads as "next step" without making the person wait.)
 *
 * - `<PageTurn step={n}>` is the step container itself: it takes the container's own classes, `ref` and aria props, so
 *   the screen's CSS keeps working. A higher `step` than before turns forward, a lower one turns back.
 * - `usePageTurn(step)` is for screens whose pages are separate blocks (the entry, the editor, the delivery bar): it
 *   says whether a turn is running, and `turnClass` gives the class for the block that comes in.
 *
 * Nothing turns on the first render, and a step that changes while the page is still opening is not a turn. While the
 * page turns, and a little after, the new page ignores the pointer: a double click on "Continuar" must not press
 * whatever the next step draws under the cursor (the second click would land on it). Keyboard use is not affected.
 * The look, the timing and the reduced-motion fade are in app/styles/page-turn.css (class names follow the design
 * system: mi-turn, mi-turn-next, mi-turn-back).
 */

export type Turn = {
  id: number;
  direction: "next" | "back";
  /** The step that was on screen and the one that came in. */
  from: number;
  to: number;
};

/**
 * The animation lasts 240ms; the new page stays out of reach of the pointer for as long as a slow double click
 * takes (about half a second), so the second click never lands on the next step.
 */
const TURN_MS = 500;
/** A step that changes while the page is still opening (a session found, a course restored) is not a turn. */
const QUIET_MS = 1200;

/** The turn that is running, or null. It ends by itself after `TURN_MS`. */
export function usePageTurn(step: number): Turn | null {
  const [opened] = useState(() => performance.now());
  const [seen, setSeen] = useState(step);
  // Every turn gets a new id, so a turn that starts right after another one ends is a new turn, not the old one.
  const [count, setCount] = useState(0);
  const [turn, setTurn] = useState<Turn | null>(null);
  if (step !== seen) {
    setSeen(step);
    if (performance.now() - opened >= QUIET_MS) {
      setCount(count + 1);
      setTurn({
        id: count + 1,
        direction: step > seen ? "next" : "back",
        from: seen,
        to: step,
      });
    }
  }
  useEffect(() => {
    if (!turn) return;
    const timer = window.setTimeout(
      () => setTurn((now) => (now?.id === turn.id ? null : now)),
      TURN_MS,
    );
    // O clique que cai na folha que vira, fora do botão que acabou de trocar, também não começa uma seleção de texto
    // (um duplo clique pintaria de azul uma palavra, ou o passo inteiro): nada se seleciona enquanto a folha vira.
    const noSelection = (event: Event) => event.preventDefault();
    document.addEventListener("selectstart", noSelection, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("selectstart", noSelection, true);
    };
  }, [turn]);
  return turn;
}

/** The class of the page that comes in (empty when nothing turns). */
export function turnClass(turn: Turn | null): string {
  return turn ? `mi-turn-${turn.direction}` : "";
}

type PageTurnProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  /** The number of the step on screen. Higher than before turns forward, lower turns back. */
  step: number;
  as?: "div" | "section";
  ref?: Ref<HTMLElement>;
  children: ReactNode;
};

export function PageTurn({
  step,
  as = "div",
  className,
  children,
  ref,
  ...rest
}: PageTurnProps) {
  const turn = usePageTurn(step);
  return createElement(
    as,
    {
      ...rest,
      ref,
      className: [
        "mi-turn",
        className,
        turn ? turnClass(turn) : undefined,
      ]
        .filter(Boolean)
        .join(" "),
    },
    children,
  );
}
