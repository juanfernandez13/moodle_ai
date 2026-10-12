"use client";

import { useEffect, useRef } from "react";
import type { OwlHandle, OwlOptions } from "./runtime.ts";
import styles from "./Owl3D.module.css";

export interface Owl3DProps {
  paused?: boolean;
  theme?: "light" | "dark";
  className?: string;
}

/** Decorative approved mascot: its fallback is present in the server HTML. */
export default function Owl3D({ paused = false, theme = "light", className }: Owl3DProps) {
  const frame = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const owl = useRef<OwlHandle | null>(null);
  const options = useRef<OwlOptions>({ paused, theme });

  useEffect(() => {
    options.current = { paused, theme };
    owl.current?.update(options.current);
  }, [paused, theme]);

  useEffect(() => {
    const parent = frame.current;
    const container = surface.current;
    if (!parent || !container) return;
    let cancelled = false;
    let mounted: OwlHandle | undefined;
    // Neither the renderer nor its local library enter the server rendering path.
    void import("./runtime.ts").then(async ({ mountOwl }) => {
      const { loadThree } = await import("./load-three.ts");
      const three = await loadThree();
      if (cancelled) return;
      mounted = mountOwl(container, three, options.current, (ready) => {
        if (!cancelled) parent.dataset.owlState = ready ? "ready" : "fallback";
      });
      owl.current = mounted;
    }).catch(() => {
      if (!cancelled) parent.dataset.owlState = "fallback";
    });
    return () => {
      cancelled = true;
      mounted?.dispose();
      if (owl.current === mounted) owl.current = null;
      parent.dataset.owlState = "fallback";
    };
  }, []);

  return (
    <div ref={frame} className={`${styles.frame}${className ? ` ${className}` : ""}`} data-owl-state="fallback" aria-hidden="true">
      <img className={styles.fallback} src="/three-owl/brand-owl.svg" width="79" height="79" alt="" draggable="false" />
      <div ref={surface} className={styles.surface} />
    </div>
  );
}
