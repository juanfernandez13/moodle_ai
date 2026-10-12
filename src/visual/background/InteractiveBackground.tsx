"use client";

import { useEffect, useRef } from "react";
import type { BackgroundHandle, BackgroundTheme } from "./runtime.ts";
import type { ThreeApi } from "./three-types.ts";
import styles from "./InteractiveBackground.module.css";

export interface InteractiveBackgroundProps {
  enabled: boolean;
  theme: BackgroundTheme;
}

/** A perspective meadow; local photographs provide a WebGL fallback. */
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
    void Promise.all([import("./runtime.ts"), import("../owl/load-three.ts")]).then(async ([{ mountBackground }, { loadThree }]) => {
      const three = await loadThree();
      if (cancelled) return;
      mounted = mountBackground(host, surface, three as unknown as ThreeApi, currentTheme.current);
      handle.current = mounted;
    }).catch(() => {
      if (!cancelled) host.dataset.fieldState = "fallback";
    });
    return () => {
      cancelled = true;
      mounted?.dispose();
      if (handle.current === mounted) handle.current = null;
    };
  }, [enabled]);
  return (
    <div ref={root} className={styles.frame} hidden={!enabled} data-theme={theme} data-field-state="fallback" aria-hidden="true">
      <div className={`${styles.photo} ${styles.day}`} />
      <div className={`${styles.photo} ${styles.dusk}`} />
      {enabled && <canvas ref={canvas} className={styles.field} />}
    </div>
  );
}
