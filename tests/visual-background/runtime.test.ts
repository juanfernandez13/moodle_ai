import { test } from "node:test";
import assert from "node:assert/strict";
import { mountBackground } from "../../src/visual/background/runtime.ts";
import type { BackgroundEnvironment } from "../../src/visual/background/runtime.ts";

class Target extends EventTarget {
  listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
  override addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean) {
    if (callback) {
      const set = this.listeners.get(type) ?? new Set();
      set.add(callback);
      this.listeners.set(type, set);
    }
    super.addEventListener(type, callback, options);
  }
  override removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean) {
    if (callback) this.listeners.get(type)?.delete(callback);
    super.removeEventListener(type, callback, options);
  }
  get listenerCount() { return [...this.listeners.values()].reduce((sum, callbacks) => sum + callbacks.size, 0); }
}

function fixture() {
  const windowTarget = new Target();
  const documentTarget = new Target();
  const reduced = Object.assign(new Target(), { matches: false });
  const frames = new Map<number, (time: number) => void>();
  let nextFrame = 0;
  let hidden = false;
  let intersection: ((visible: boolean) => void) | undefined;
  let resize: (() => void) | undefined;
  let disconnected = 0;
  const environment: BackgroundEnvironment = {
    windowTarget, documentTarget, reduced,
    hidden: () => hidden,
    pixelRatio: () => 4,
    request(callback) { const id = ++nextFrame; frames.set(id, callback); return id; },
    cancel(id) { frames.delete(id); },
    resizeObserver(callback) { resize = callback; return { observe() {}, disconnect() { disconnected++; } }; },
    intersectionObserver(callback) { intersection = callback; return { observe() {}, disconnect() { disconnected++; } }; },
  };
  const css = new Map<string, string>();
  let width = 360, height = 800;
  const host = {
    hidden: false,
    dataset: {} as Record<string, string>,
    style: { setProperty(key: string, value: string) { css.set(key, value); }, removeProperty(key: string) { css.delete(key); } },
    getBoundingClientRect() { return { left: 0, top: 0, width, height }; },
  } as unknown as HTMLDivElement;
  let paints = 0;
  let failDrawing = false;
  const arcs: number[][] = [];
  const strokes: number[][] = [];
  const context = {
    setTransform() {},
    clearRect() { if (failDrawing) throw new Error("Canvas unavailable"); paints++; arcs.length = strokes.length = 0; },
    beginPath() {}, moveTo() {},
    quadraticCurveTo(...coordinates: number[]) { strokes.push(coordinates); },
    stroke() {},
    arc(...coordinates: number[]) { arcs.push(coordinates); },
    fill() {}, fillStyle: "", strokeStyle: "", lineWidth: 0,
  } as unknown as CanvasRenderingContext2D;
  const canvas = { width: 0, height: 0, getContext: () => context } as unknown as HTMLCanvasElement;
  return {
    host, canvas, environment, windowTarget, documentTarget, reduced, css, frames, arcs, strokes,
    get paints() { return paints; },
    get disconnected() { return disconnected; },
    fail() { failDrawing = true; },
    resize(nextWidth: number, nextHeight: number) { width = nextWidth; height = nextHeight; resize?.(); },
    viewport(visible: boolean) { intersection?.(visible); },
    hide(next: boolean) { hidden = next; documentTarget.dispatchEvent(new Event("visibilitychange")); },
    pointer(x: number, y: number, type = "mouse") {
      const event = Object.assign(new Event("pointermove", { cancelable: true }), { clientX: x, clientY: y, pointerType: type });
      windowTarget.dispatchEvent(event);
      return event;
    },
    tick(time: number) {
      const callbacks = [...frames.values()];
      frames.clear();
      for (const callback of callbacks) callback(time);
    },
  };
}

test("pointer depth affects background only, touch requires no hover and drawing stays below 30fps", () => {
  const f = fixture();
  const field = mountBackground(f.host, f.canvas, "light", f.environment);
  assert.equal(f.host.dataset.fieldState, "interactive");
  assert.equal(f.canvas.width, 450);
  assert.equal(f.canvas.height, 1000);
  f.tick(0);
  const start = f.paints;
  f.pointer(360, 800, "touch");
  f.tick(16);
  assert.equal(f.paints, start);
  f.tick(40);
  assert.equal(f.css.get("--field-x"), "0.000px");
  const event = f.pointer(360, 800);
  f.tick(80);
  assert.equal(event.defaultPrevented, false);
  assert.ok(parseFloat(f.css.get("--field-x")!) > 0);
  assert.ok(parseFloat(f.css.get("--field-x")!) <= 18);
  assert.ok(parseFloat(f.css.get("--field-y")!) <= 12);
  assert.ok(f.arcs.length <= 12);
  assert.ok(f.strokes.length <= 30);
  field.dispose();
});

test("hidden, offscreen and reduced motion stop loops; reduced motion is static and neutral", () => {
  const f = fixture();
  const field = mountBackground(f.host, f.canvas, "dark", f.environment);
  f.tick(0);
  f.pointer(360, 800);
  f.tick(40);
  f.hide(true);
  const hiddenPaints = f.paints;
  assert.equal(f.frames.size, 0);
  field.setTheme("light");
  f.tick(10000);
  assert.equal(f.paints, hiddenPaints);
  f.hide(false);
  assert.equal(f.frames.size, 1);
  f.viewport(false);
  assert.equal(f.frames.size, 0);
  f.viewport(true);
  f.reduced.matches = true;
  f.reduced.dispatchEvent(new Event("change"));
  assert.equal(f.frames.size, 0);
  assert.equal(f.host.dataset.fieldState, "static");
  assert.equal(f.css.get("--field-x"), "0.000px");
  const still = f.paints;
  f.pointer(360, 800);
  f.tick(20000);
  assert.equal(f.paints, still);
  f.reduced.matches = false;
  f.reduced.dispatchEvent(new Event("change"));
  assert.equal(f.frames.size, 1);
  field.dispose();
});

test("Fundo off/dispose clears listeners, observers, depth variables and backing pixels; reenable creates one loop", () => {
  const f = fixture();
  const field = mountBackground(f.host, f.canvas, "light", f.environment);
  f.host.hidden = true;
  const stopped = f.paints;
  f.tick(40);
  assert.equal(f.paints, stopped);
  assert.equal(f.frames.size, 0);
  field.dispose();
  field.dispose();
  field.setTheme("dark");
  f.pointer(100, 200);
  assert.equal(f.windowTarget.listenerCount + f.documentTarget.listenerCount + f.reduced.listenerCount, 0);
  assert.equal(f.disconnected, 2);
  assert.equal(f.css.size, 0);
  assert.equal(f.canvas.width * f.canvas.height, 0);
  f.host.hidden = false;
  const next = mountBackground(f.host, f.canvas, "dark", f.environment);
  assert.equal(f.frames.size, 1);
  assert.ok(f.canvas.width * f.canvas.height > 0);
  next.dispose();
  assert.equal(f.frames.size, 0);
});

test("zero-size and huge-size boundaries stop or constrain work and recover after resize", () => {
  const f = fixture();
  const field = mountBackground(f.host, f.canvas, "light", f.environment);
  f.resize(0, 0);
  assert.equal(f.frames.size, 0);
  assert.equal(f.host.dataset.fieldState, "static");
  assert.equal(f.canvas.width * f.canvas.height, 0);
  f.resize(7680, 4320);
  assert.ok(f.canvas.width * f.canvas.height <= 1_600_000);
  assert.equal(f.frames.size, 1);
  assert.ok(f.arcs.length <= 24 && f.strokes.length <= 56);
  field.dispose();
});

test("missing or failed Canvas preserves static photo fallback without a loop or leaked resources", () => {
  const noCanvas = fixture();
  noCanvas.canvas.getContext = (() => null) as HTMLCanvasElement["getContext"];
  const fallback = mountBackground(noCanvas.host, noCanvas.canvas, "light", noCanvas.environment);
  assert.equal(noCanvas.host.dataset.fieldState, "static");
  assert.equal(noCanvas.frames.size, 0);
  assert.equal(noCanvas.windowTarget.listenerCount, 0);
  fallback.dispose();
  const f = fixture();
  const field = mountBackground(f.host, f.canvas, "light", f.environment);
  f.tick(0);
  f.fail();
  f.tick(40);
  assert.equal(f.host.dataset.fieldState, "static");
  assert.equal(f.frames.size, 0);
  assert.equal(f.canvas.width * f.canvas.height, 0);
  assert.equal(f.css.size, 0);
  assert.equal(f.windowTarget.listenerCount + f.documentTarget.listenerCount + f.reduced.listenerCount, 0);
  assert.equal(f.disconnected, 2);
  field.dispose();
});
