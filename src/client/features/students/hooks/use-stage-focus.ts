"use client";
import { useEffect, useRef } from "react";
import type { RefObject } from "react";

/**
 * Moves focus to a stage's heading when the stage opens, so keyboard and screen reader users land on the
 * new screen instead of on a button that just disappeared. `skipFirst` keeps a screen that is already open
 * when the page loads from taking the focus. It reacts to the change from hidden to visible, so the double
 * run of effects in development does not move the focus twice.
 */
export function useStageFocus(
  visible: boolean,
  skipFirst: boolean,
): RefObject<HTMLHeadingElement | null> {
  const heading = useRef<HTMLHeadingElement>(null);
  const before = useRef<boolean | null>(null);
  useEffect(() => {
    const was = before.current;
    before.current = visible;
    const opened = visible && (was === false || (was === null && !skipFirst));
    if (opened) heading.current?.focus({ preventScroll: true });
  }, [visible, skipFirst]);
  return heading;
}
