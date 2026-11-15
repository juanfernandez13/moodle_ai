"use client";
import { useEffect, useState } from "react";

/**
 * The same text, but only after it has stopped changing for a moment. For live regions that would otherwise speak
 * on every keystroke (the "saved" message of the editor, the count of things to fix): the screen shows the text at
 * once, the screen reader hears the final one.
 */
export function useCalmText(text: string, delay = 1500): string {
  const [calm, setCalm] = useState(text);
  useEffect(() => {
    const timer = window.setTimeout(() => setCalm(text), delay);
    return () => window.clearTimeout(timer);
  }, [text, delay]);
  return calm;
}
