"use client";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import type { RefObject } from "react";
import { STUDENT_PAGE_SIZE, studentRowsThatFit } from "../helpers.ts";

/** The same condition as shell.css and tools.css: from here the app has the height of the window and the page does not scroll. */
const FIXED_HEIGHT = "(min-width: 720px) and (min-height: 540px)";
/** students.css: up to here each student is a card, five or six fields tall. */
const CARDS = "(max-width: 640px)";
/** A card is about 480px tall: three of them already fill a phone screen twice. */
const CARDS_PER_PAGE = 3;
/** The page scrolls on its own (low window): a page of five rows is the right size to read and scroll. */
const SCROLLING_PAGE = 5;

/**
 * How many students the review table shows per page. In a window that keeps its height the answer is what fits:
 * everything else on the screen (title, steps, pendências, options, buttons) is measured, and what is left is
 * divided by the height of a row, so the table never scrolls inside the page and the pagination does its job. Elsewhere
 * (phone, low window) the page scrolls and the size is fixed.
 */
export function measureReviewPageSize(section: HTMLElement, fallback: number): number {
  if (matchMedia(CARDS).matches) return CARDS_PER_PAGE;
  if (!matchMedia(FIXED_HEIGHT).matches) return SCROLLING_PAGE;
  const panel = section.closest<HTMLElement>(".students-panel");
  const main = panel?.parentElement;
  const body = section.closest<HTMLElement>(".stu-body");
  const rows = section.querySelector("tbody")?.getBoundingClientRect();
  const count = section.querySelectorAll("tbody tr").length;
  if (!panel || !main || !body || !rows || count === 0) return fallback;
  const style = getComputedStyle(main);
  const space = main.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  // What the panel would measure with the rows now on screen, whether or not it had to shrink to fit the window:
  // the body (the part that scrolls) reports its whole content in scrollHeight.
  const natural = panel.offsetHeight - body.clientHeight + body.scrollHeight;
  const others = natural - rows.height;
  return studentRowsThatFit(space - others, rows.height / count);
}

export function useReviewPageSize(section: RefObject<HTMLElement | null>): number {
  const [size, setSize] = useState(STUDENT_PAGE_SIZE);
  const update = useCallback(() => {
    const node = section.current;
    if (node) setSize((previous) => measureReviewPageSize(node, previous));
  }, [section]);
  // After every render, before the screen is drawn: fixing a pendência takes its line off the screen and gives a row back.
  useLayoutEffect(update);
  useEffect(() => {
    const node = section.current;
    const panel = node?.closest(".students-panel");
    if (!panel?.parentElement) return;
    const observer = new ResizeObserver(update);
    observer.observe(panel.parentElement);
    observer.observe(panel);
    const queries = [matchMedia(CARDS), matchMedia(FIXED_HEIGHT)];
    for (const query of queries) query.addEventListener("change", update);
    return () => {
      observer.disconnect();
      for (const query of queries) query.removeEventListener("change", update);
    };
  }, [section, update]);
  return size;
}
