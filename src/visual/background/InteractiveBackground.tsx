"use client";

import { useEffect, useRef } from "react";
import type { BackgroundHandle, BackgroundTheme } from "./runtime.ts";
import styles from "./InteractiveBackground.module.css";

export interface InteractiveBackgroundProps {
  enabled: boolean;
  theme: BackgroundTheme;
}

/** Local meadow photographs, depth layers and a transparent 2D field. */
export default function InteractiveBackground({ enabled, theme }: InteractiveBackgroundProps) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const handle = useRef<BackgroundHandle | null>(null);
  const currentTheme = useRef(theme);
  useEffect(() => {
    currentTheme.current = theme;
    handle.current?.setTheme(theme);
  }, [theme]);
  useEffect(() => {
    const host = root.current;
    const surface = canvas.current;
    if (!enabled || !host || !surface) return;
    let cancelled = false;
    let mounted: BackgroundHandle | undefined;
    void import("./runtime.ts").then(({ mountBackground }) => {
      if (cancelled) return;
      mounted = mountBackground(host, surface, currentTheme.current);
      handle.current = mounted;
    }).catch(() => {
      if (!cancelled) host.dataset.fieldState = "static";
    });
    return () => {
      cancelled = true;
      mounted?.dispose();
      if (handle.current === mounted) handle.current = null;
    };
  }, [enabled]);
  return (
    <div ref={root} className={styles.frame} hidden={!enabled} data-theme={theme} data-field-state="static" aria-hidden="true">
      <div className={`${styles.photo} ${styles.day}`} />
      <div className={`${styles.photo} ${styles.dusk}`} />
      <div className={styles.atmosphere} />
      <div className={styles.light} />
      <canvas ref={canvas} className={styles.field} />
    </div>
  );
}
