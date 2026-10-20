"use client";
import {
  createElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { HTMLAttributes, ReactNode, Ref } from "react";

/**
 * PageTurn: when the step changes, a sheet of notebook paper turns over the step area, like a page of the
 * notebook. Going forward the sheet covers the area and swings away to the left, hinged on its left edge, and the
 * new step (already in place underneath, interactive) shows as it leaves. Going back, the sheet comes from the left
 * and lands on the area, then fades to show the step. Only the step area turns: header, steps and background stay.
 *
 * - `<PageTurn step={n}>` is the step container itself: it takes the container's own classes, `ref` and aria props, so
 *   the screen's CSS keeps working. A higher `step` than before turns forward, a lower one turns back.
 * - `<PageTurnOverlay step={n} />` is for screens whose content must stay a direct child of a flex parent: it turns
 *   the area of the closest positioned ancestor.
 *
 * Nothing turns on the first render, and a step that changes while the page is still opening is not a turn. The sheet
 * is decorative (aria-hidden, no pointer events) and does not take part in the layout. The look, the timing and the
 * reduced-motion crossfade are in app/styles/page-turn.css (class names follow the design system: mi-turn,
 * mi-turn-next, mi-turn-back).
 */

type Turn = { id: number; direction: "next" | "back" };

/** The animation lasts 600ms. If the browser never reports its end, the sheet is taken away after this. */
const FALLBACK_MS = 1000;
/** A step that changes while the page is still opening (a session found, a course restored) is not a turn. */
const QUIET_MS = 1200;

function useTurn(step: number) {
  const [opened] = useState(() => performance.now());
  const [seen, setSeen] = useState(step);
  // Every turn gets a new id, so a turn that starts right after another one ends is a new sheet, not the old one.
  const [count, setCount] = useState(0);
  const [turn, setTurn] = useState<Turn | null>(null);
  if (step !== seen) {
    setSeen(step);
    if (performance.now() - opened >= QUIET_MS) {
      setCount(count + 1);
      setTurn({ id: count + 1, direction: step > seen ? "next" : "back" });
    }
  }
  const finish = useCallback(
    (id: number) => setTurn((now) => (now?.id === id ? null : now)),
    [],
  );
  return { turn, finish };
}

/** The layer that clips the sheet to the step area, with the sheet inside. It exists only while a turn runs. */
function TurnStage({
  turn,
  onDone,
}: {
  turn: Turn;
  onDone: (id: number) => void;
}) {
  const stage = useRef<HTMLDivElement>(null);

  // Before the first paint: the sheet gets its depth and is lined up with the ruled page behind it.
  useLayoutEffect(() => {
    const node = stage.current;
    if (!node) return;
    const measure = () => {
      const area = node.getBoundingClientRect();
      const page = node.closest(".application")?.getBoundingClientRect();
      node.style.setProperty(
        "--turn-p",
        `${Math.max(1600, Math.round(area.width * 2.8))}px`,
      );
      node.style.setProperty(
        "--turn-x",
        `${Math.round(area.left - (page?.left ?? 0))}px`,
      );
      node.style.setProperty(
        "--turn-y",
        `${Math.round(area.top - (page?.top ?? 0))}px`,
      );
    };
    // A container that scrolls (the step body, the main area) must not carry the sheet out of sight.
    const host = node.offsetParent;
    if (!(host instanceof HTMLElement)) {
      measure();
      return;
    }
    const follow = () => {
      node.style.top = `${host.scrollTop}px`;
      node.style.bottom = `${-host.scrollTop}px`;
    };
    follow();
    measure();
    host.addEventListener("scroll", follow, { passive: true });
    return () => host.removeEventListener("scroll", follow);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => onDone(turn.id), FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, [turn.id, onDone]);

  return (
    <div
      ref={stage}
      className="mi-turn-stage"
      data-turn={turn.direction}
      aria-hidden="true"
      onAnimationEnd={(event) => {
        // The layer's own animation ends the turn; the sheet's and the pseudo-elements' only bubble up here.
        if (event.target === event.currentTarget && event.pseudoElement === "")
          onDone(turn.id);
      }}
    >
      <div className={`mi-turn-sheet mi-turn-${turn.direction}`} />
    </div>
  );
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
  const { turn, finish } = useTurn(step);
  return createElement(
    as,
    {
      ...rest,
      ref,
      className: className ? `mi-turn ${className}` : "mi-turn",
      "data-turning": turn?.direction,
    },
    children,
    turn && <TurnStage key={turn.id} turn={turn} onDone={finish} />,
  );
}

export function PageTurnOverlay({ step }: { step: number }) {
  const { turn, finish } = useTurn(step);
  return turn ? <TurnStage key={turn.id} turn={turn} onDone={finish} /> : null;
}
