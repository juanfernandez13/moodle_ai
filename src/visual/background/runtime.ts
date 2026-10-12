import { createField, drawField, pointerPosition, viewportBudget } from "./field.ts";
import type { Field, Point, ViewportBudget } from "./field.ts";

export type BackgroundTheme = "light" | "dark";

export interface BackgroundHandle {
  setTheme(theme: BackgroundTheme): void;
  dispose(): void;
}

interface Observer {
  observe(target: Element): void;
  disconnect(): void;
}

export interface BackgroundEnvironment {
  windowTarget: EventTarget;
  documentTarget: EventTarget;
  hidden(): boolean;
  pixelRatio(): number;
  reduced: { matches: boolean; addEventListener(type: "change", callback: EventListener): void; removeEventListener(type: "change", callback: EventListener): void };
  request(callback: (time: number) => void): number;
  cancel(id: number): void;
  resizeObserver?(callback: () => void): Observer;
  intersectionObserver?(callback: (visible: boolean) => void): Observer;
}

function browserEnvironment(): BackgroundEnvironment {
  return {
    windowTarget: window, documentTarget: document,
    hidden: () => document.hidden,
    pixelRatio: () => window.devicePixelRatio || 1,
    reduced: window.matchMedia("(prefers-reduced-motion: reduce)"),
    request: (callback) => requestAnimationFrame(callback),
    cancel: (id) => cancelAnimationFrame(id),
    ...(typeof ResizeObserver === "undefined" ? {} : { resizeObserver: (callback: () => void) => new ResizeObserver(callback) }),
    ...(typeof IntersectionObserver === "undefined" ? {} : {
      intersectionObserver: (callback: (visible: boolean) => void) => new IntersectionObserver((entries) => callback(entries.some((entry) => entry.isIntersecting))),
    }),
  };
}

const properties = ["--field-x", "--field-y", "--field-light-x", "--field-light-y"];

/** Owns only the fixed background; it never transforms the application or form. */
export function mountBackground(
  host: HTMLDivElement,
  canvas: HTMLCanvasElement,
  initialTheme: BackgroundTheme,
  environment: BackgroundEnvironment = browserEnvironment(),
): BackgroundHandle {
  let disposed = false;
  let theme = initialTheme;
  let context: CanvasRenderingContext2D | null = null;
  let frame: number | null = null;
  let last: number | null = null;
  let elapsed = 0;
  let inViewport = true;
  let failed = false;
  let budget: ViewportBudget | null = null;
  let field: Field | null = null;
  let bounds = host.getBoundingClientRect();
  let target: Point = { x: 0, y: 0 };
  let point: Point = { x: 0, y: 0 };
  const cleanups: (() => void)[] = [];
  const visible = () => !disposed && !environment.hidden() && inViewport && !host.hidden;
  const moving = () => visible() && !failed && !environment.reduced.matches && !!budget && !!context;
  function stop() {
    if (frame !== null) environment.cancel(frame);
    frame = null;
    last = null;
  }
  function resetDepth() {
    point = target = { x: 0, y: 0 };
    for (const property of properties) host.style.removeProperty(property);
  }
  function paint() {
    if (!visible() || !budget || !field || !context || failed) return;
    try {
      host.style.setProperty("--field-x", `${(point.x * 18).toFixed(3)}px`);
      host.style.setProperty("--field-y", `${(point.y * 12).toFixed(3)}px`);
      host.style.setProperty("--field-light-x", `${50 + point.x * 27}%`);
      host.style.setProperty("--field-light-y", `${38 + point.y * 13}%`);
      drawField(context, field, budget, point, elapsed, theme === "dark");
    } catch {
      failed = true;
      dispose();
    }
  }
  function tick(time: number) {
    frame = null;
    if (!moving()) return;
    if (last === null || time - last >= 1000 / 30) {
      const dt = last === null ? 0 : Math.min(Math.max((time - last) / 1000, 0), 0.05);
      last = time;
      elapsed += dt;
      const blend = 1 - Math.exp(-dt * 8);
      point.x += (target.x - point.x) * blend;
      point.y += (target.y - point.y) * blend;
      paint();
    }
    if (moving()) frame = environment.request(tick);
  }
  function update() {
    stop();
    if (disposed) return;
    if (environment.reduced.matches) resetDepth();
    host.dataset.fieldState = moving() ? "interactive" : "static";
    if (visible()) paint();
    if (moving()) frame = environment.request(tick);
  }
  function resize() {
    if (disposed || failed) return;
    bounds = host.getBoundingClientRect();
    budget = viewportBudget(bounds.width, bounds.height, environment.pixelRatio());
    if (!budget) {
      field = null;
      canvas.width = canvas.height = 0;
      resetDepth();
      update();
      return;
    }
    field = createField(budget);
    if (canvas.width !== budget.pixelsWide) canvas.width = budget.pixelsWide;
    if (canvas.height !== budget.pixelsHigh) canvas.height = budget.pixelsHigh;
    update();
  }
  function listen(target: EventTarget, type: string, callback: EventListener) {
    target.addEventListener(type, callback, { passive: true });
    cleanups.push(() => target.removeEventListener(type, callback));
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    for (const cleanup of cleanups.splice(0)) cleanup();
    resetDepth();
    canvas.width = canvas.height = 0;
    field = null;
    context = null;
    host.dataset.fieldState = "static";
  }
  try { context = canvas.getContext("2d", { alpha: true }); } catch { failed = true; }
  if (!context) {
    host.dataset.fieldState = "static";
    canvas.width = canvas.height = 0;
    return { setTheme(next) { theme = next; }, dispose };
  }
  try {
    listen(environment.windowTarget, "pointermove", (event) => {
      if (!moving()) return;
      const pointer = event as PointerEvent;
      if (pointer.pointerType === "touch") return;
      target = pointerPosition(pointer.clientX - bounds.left, pointer.clientY - bounds.top, bounds.width, bounds.height);
    });
    listen(environment.windowTarget, "pointerout", (event) => {
      if (!(event as PointerEvent).relatedTarget) target = { x: 0, y: 0 };
    });
    listen(environment.documentTarget, "visibilitychange", update);
    const reducedChanged: EventListener = update;
    environment.reduced.addEventListener("change", reducedChanged);
    cleanups.push(() => environment.reduced.removeEventListener("change", reducedChanged));
    const resizeWatch = environment.resizeObserver?.(resize);
    resizeWatch?.observe(host);
    if (resizeWatch) cleanups.push(() => resizeWatch.disconnect());
    else listen(environment.windowTarget, "resize", resize);
    const viewportWatch = environment.intersectionObserver?.((visible) => { inViewport = visible; update(); });
    viewportWatch?.observe(host);
    if (viewportWatch) cleanups.push(() => viewportWatch.disconnect());
    resize();
  } catch {
    dispose();
  }
  return {
    setTheme(next) {
      if (disposed) return;
      theme = next;
      if (visible()) paint();
    },
    dispose,
  };
}
