import { pointerPosition, viewportBudget } from "./field.ts";
import { createLandscape } from "./landscape.ts";
import type { Point, ViewportBudget } from "./field.ts";
import type { Landscape } from "./landscape.ts";
import type { Renderer, ThreeApi } from "./three-types.ts";

export type BackgroundTheme = "light" | "dark";
export interface BackgroundHandle { setTheme(theme: BackgroundTheme): void; dispose(): void }
interface Observer { observe(target: Element): void; disconnect(): void }
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
    windowTarget: window, documentTarget: document, hidden: () => document.hidden,
    pixelRatio: () => window.devicePixelRatio || 1,
    reduced: window.matchMedia("(prefers-reduced-motion: reduce)"),
    request: (callback) => requestAnimationFrame(callback), cancel: (id) => cancelAnimationFrame(id),
    ...(typeof ResizeObserver === "undefined" ? {} : { resizeObserver: (callback: () => void) => new ResizeObserver(callback) }),
    ...(typeof IntersectionObserver === "undefined" ? {} : {
      intersectionObserver: (callback: (visible: boolean) => void) => new IntersectionObserver((entries) => callback(entries.some((entry) => entry.isIntersecting))),
    }),
  };
}

/** Owns the background camera and GPU resources; application panels never transform. */
export function mountBackground(
  host: HTMLDivElement, canvas: HTMLCanvasElement, T: ThreeApi, initialTheme: BackgroundTheme,
  environment: BackgroundEnvironment = browserEnvironment(),
): BackgroundHandle {
  let disposed = false, contextAvailable = true, inViewport = true;
  let theme = initialTheme;
  let renderer: Renderer | undefined, landscape: Landscape | undefined;
  let budget: ViewportBudget | null = null;
  let frame: number | null = null, last: number | null = null, elapsed = 0;
  let bounds = host.getBoundingClientRect();
  let target: Point = { x: 0, y: 0 }, point: Point = { x: 0, y: 0 };
  const cleanups: (() => void)[] = [];
  const visible = () => !disposed && !environment.hidden() && inViewport && !host.hidden;
  const renderable = () => visible() && contextAvailable && !!budget && !!renderer && !!landscape;
  const moving = () => renderable() && !environment.reduced.matches;
  function stop() {
    if (frame !== null) environment.cancel(frame);
    frame = last = null;
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    for (const cleanup of cleanups.splice(0)) cleanup();
    landscape?.dispose(); landscape = undefined;
    renderer?.renderLists?.dispose();
    renderer?.dispose(); renderer?.forceContextLoss(); renderer = undefined;
    canvas.width = canvas.height = 0;
    host.dataset.fieldState = "fallback";
  }
  function paint() {
    if (!renderable()) return;
    try {
      landscape!.animate(elapsed, point);
      renderer!.render(landscape!.scene, landscape!.camera);
      host.dataset.fieldState = moving() ? "interactive" : "static";
    } catch { dispose(); }
  }
  function tick(time: number) {
    frame = null;
    if (!moving()) return;
    if (last === null || time - last >= 1000 / 30) {
      const dt = last === null ? 0 : Math.min(Math.max((time - last) / 1000, 0), .05);
      last = time; elapsed += dt;
      const blend = 1 - Math.exp(-dt * 7);
      point.x += (target.x - point.x) * blend; point.y += (target.y - point.y) * blend;
      paint();
    }
    if (moving()) frame = environment.request(tick);
  }
  function update() {
    stop();
    if (disposed) return;
    if (environment.reduced.matches) point = target = { x: 0, y: 0 };
    if (renderable()) paint();
    else host.dataset.fieldState = contextAvailable && landscape ? "static" : "fallback";
    if (moving()) frame = environment.request(tick);
  }
  function resize() {
    if (disposed) return;
    try {
      bounds = host.getBoundingClientRect();
      const next = viewportBudget(bounds.width, bounds.height, environment.pixelRatio());
      if (!next) {
        budget = null;
        canvas.width = canvas.height = 0;
        point = target = { x: 0, y: 0 };
        update(); return;
      }
      // Only a quality breakpoint rebuilds topology; ordinary resizes reuse attribute buffers.
      if (!landscape || budget?.compact !== next.compact) {
        landscape?.dispose(); landscape = undefined;
        landscape = createLandscape(T, next);
        landscape.setTheme(theme);
      } else landscape.resize(next);
      budget = next;
      renderer!.setPixelRatio(next.ratio);
      renderer!.setSize(next.width, next.height, false);
      update();
    } catch { dispose(); }
  }
  function listen(target: EventTarget, type: string, callback: EventListener, passive = true) {
    target.addEventListener(type, callback, { passive });
    cleanups.push(() => target.removeEventListener(type, callback));
  }
  try {
    renderer = new T.WebGLRenderer({ canvas, alpha: false, antialias: true, powerPreference: "low-power" });
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.NoToneMapping;
    listen(environment.windowTarget, "pointermove", (event) => {
      if (!moving()) return;
      const pointer = event as PointerEvent;
      if (pointer.pointerType !== "touch") target = pointerPosition(pointer.clientX - bounds.left, pointer.clientY - bounds.top, bounds.width, bounds.height);
    });
    listen(environment.windowTarget, "pointerout", (event) => {
      if (!(event as PointerEvent).relatedTarget) target = { x: 0, y: 0 };
    });
    listen(environment.documentTarget, "visibilitychange", update);
    const reducedChanged: EventListener = update;
    environment.reduced.addEventListener("change", reducedChanged);
    cleanups.push(() => environment.reduced.removeEventListener("change", reducedChanged));
    listen(canvas, "webglcontextlost", (event) => {
      event.preventDefault(); contextAvailable = false; update();
    }, false);
    listen(canvas, "webglcontextrestored", () => { contextAvailable = true; resize(); });
    const sizeWatch = environment.resizeObserver?.(resize);
    sizeWatch?.observe(host);
    if (sizeWatch) cleanups.push(() => sizeWatch.disconnect());
    else listen(environment.windowTarget, "resize", resize);
    const viewportWatch = environment.intersectionObserver?.((visible) => { inViewport = visible; update(); });
    viewportWatch?.observe(host);
    if (viewportWatch) cleanups.push(() => viewportWatch.disconnect());
    resize();
  } catch { dispose(); }
  return {
    setTheme(next) {
      if (disposed) return;
      theme = next;
      try { landscape?.setTheme(next); paint(); } catch { dispose(); }
    },
    dispose,
  };
}
