"use client";
import { useEffect, useRef } from "react";

/** A step that changes while the page is still opening (a course restored, a session found) is not an arrival. */
const QUIET_MS = 1200;

/**
 * When the person moves to another step of the same page (the editor opens, they go back to the entry, the backup is
 * ready), the focus goes to that step's title instead of staying on a button that has just disappeared, and a screen
 * reader says where they are. Nothing moves on the first render or while the page is still opening, and a step that
 * does not change leaves the focus where it is. `find` is called after the new step is on screen. A step that asks to be
 * revealed (`reveal`, for the one whose title may lie far below the first screen of a phone, like the file ready to
 * download) also scrolls to its title when it is out of view; the others never move the page.
 */
export function useArrivalFocus(
  step: number,
  find: (step: number) => HTMLElement | null,
  reveal: (step: number) => boolean = () => false,
) {
  const seen = useRef(step);
  const finder = useRef(find);
  finder.current = find;
  const revealer = useRef(reveal);
  revealer.current = reveal;
  useEffect(() => {
    if (seen.current === step) return;
    seen.current = step;
    if (performance.now() < QUIET_MS) return;
    const target = finder.current(step);
    if (!target) return;
    target.tabIndex = -1;
    target.focus({ preventScroll: true });
    // Num celular o título pode estar bem abaixo da primeira tela: a página rola até ele. Se ele já está à vista, nada se mexe.
    if (!revealer.current(step)) return;
    const box = target.getBoundingClientRect();
    if (box.top < 0 || box.bottom > window.innerHeight)
      target.scrollIntoView({ block: "start" });
  }, [step]);
}
