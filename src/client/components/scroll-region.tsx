"use client";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/**
 * A box that scrolls (a table that is longer or wider than its space). Content that only reads, with nothing to focus
 * inside, cannot be scrolled with the keyboard, so when there is more to see than fits the box becomes a region with
 * a name that takes the focus (Tab, then the arrow keys). When everything fits it stays out of the way.
 */
export function ScrollRegion({
  label,
  className,
  children,
}: {
  label: string;
  className?: string | undefined;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [scrolls, setScrolls] = useState(false);
  useEffect(() => {
    const node = box.current;
    if (!node) return;
    const measure = () =>
      setScrolls(
        node.scrollHeight > node.clientHeight + 1 ||
          node.scrollWidth > node.clientWidth + 1,
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    for (const child of Array.from(node.children)) observer.observe(child);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={box}
      className={className}
      {...(scrolls
        ? { tabIndex: 0, role: "region", "aria-label": label }
        : {})}
    >
      {children}
    </div>
  );
}
