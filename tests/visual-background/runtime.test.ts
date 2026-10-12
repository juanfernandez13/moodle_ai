import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { mountBackground } from "../../src/visual/background/runtime.ts";
import type { BackgroundEnvironment } from "../../src/visual/background/runtime.ts";
import type { Camera, Geometry, Object3D, Renderer, Scene, ShaderMaterial, ThreeApi } from "../../src/visual/background/three-types.ts";

interface ObservableResource { addEventListener(type: "dispose", callback: () => void): void }
interface SceneObject extends Object3D {
  children: SceneObject[];
  geometry?: Geometry & ObservableResource;
  material?: ShaderMaterial & ObservableResource;
}
class Target extends EventTarget {
  listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
  override addEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: AddEventListenerOptions | boolean) {
    if (callback) { const set = this.listeners.get(type) ?? new Set(); set.add(callback); this.listeners.set(type, set); }
    super.addEventListener(type, callback, options);
  }
  override removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null, options?: EventListenerOptions | boolean) {
    if (callback) this.listeners.get(type)?.delete(callback);
    super.removeEventListener(type, callback, options);
  }
  get listenerCount() { return [...this.listeners.values()].reduce((count, set) => count + set.size, 0); }
}

function fixture(reduced = false) {
  const library: { THREE?: ThreeApi } = {};
  runInNewContext(readFileSync(new URL("../../public/three-owl/three.browser.js", import.meta.url), "utf8"), { window: library, console });
  const three = library.THREE!;
  const windowTarget = new Target(), documentTarget = new Target();
  const media = Object.assign(new Target(), { matches: reduced });
  const frames = new Map<number, (time: number) => void>();
  let nextFrame = 0, hidden = false, width = 360, height = 800;
  let intersection: ((visible: boolean) => void) | undefined, resize: (() => void) | undefined;
  let disconnected = 0;
  const environment: BackgroundEnvironment = {
    windowTarget, documentTarget, reduced: media,
    hidden: () => hidden, pixelRatio: () => 4,
    request(callback) { const id = ++nextFrame; frames.set(id, callback); return id; },
    cancel(id) { frames.delete(id); },
    resizeObserver(callback) { resize = callback; return { observe() {}, disconnect() { disconnected++; } }; },
    intersectionObserver(callback) { intersection = callback; return { observe() {}, disconnect() { disconnected++; } }; },
  };
  const host = {
    hidden: false, dataset: {} as Record<string, string>,
    getBoundingClientRect() { return { left: 0, top: 0, width, height }; },
  } as unknown as HTMLDivElement;
  const surface = Object.assign(new Target(), { width: 0, height: 0 });
  const canvas = surface as unknown as HTMLCanvasElement;
  const renderers: FakeRenderer[] = [];
  class FakeRenderer implements Renderer {
    domElement = canvas;
    outputColorSpace = ""; toneMapping = 0;
    ratio = 1; renders = 0; disposals = 0; contextLosses = 0; listDisposals = 0;
    fail = false;
    scene?: SceneObject; camera?: Camera;
    renderLists = { dispose: () => this.listDisposals++ };
    constructor(options: { canvas: HTMLCanvasElement }) { assert.equal(options.canvas, canvas); renderers.push(this); }
    setPixelRatio(ratio: number) { this.ratio = ratio; }
    setSize(w: number, h: number) { canvas.width = Math.floor(w * this.ratio); canvas.height = Math.floor(h * this.ratio); }
    render(scene: Scene, camera: Camera) {
      if (this.fail) throw new Error("WebGL rendering failed");
      this.scene = scene as unknown as SceneObject; this.camera = camera; this.renders++;
      assert.equal(camera.aspect, width / height);
    }
    dispose() { this.disposals++; }
    forceContextLoss() { this.contextLosses++; }
  }
  three.WebGLRenderer = FakeRenderer;
  return {
    three, host, canvas, surface, environment, windowTarget, documentTarget, media, frames, renderers,
    get disconnected() { return disconnected; },
    resize(w: number, h: number) { width = w; height = h; resize?.(); },
    viewport(visible: boolean) { intersection?.(visible); },
    hide(next: boolean) { hidden = next; documentTarget.dispatchEvent(new Event("visibilitychange")); },
    pointer(x: number, y: number, type = "mouse") {
      const event = Object.assign(new Event("pointermove", { cancelable: true }), { clientX: x, clientY: y, pointerType: type });
      windowTarget.dispatchEvent(event); return event;
    },
    tick(time: number) { const callbacks = [...frames.values()]; frames.clear(); for (const callback of callbacks) callback(time); },
  };
}

function resources(scene: SceneObject) {
  const counts = new Map<ObservableResource, number>();
  function visit(object: SceneObject) {
    for (const resource of [object.geometry, object.material]) {
      if (resource && !counts.has(resource)) {
        counts.set(resource, 0);
        resource.addEventListener("dispose", () => counts.set(resource, counts.get(resource)! + 1));
      }
    }
    object.children.forEach(visit);
  }
  visit(scene); return counts;
}

test("actual local perspective landscape obeys the pixel budget, pointer camera depth and 30fps cap", () => {
  const f = fixture();
  const background = mountBackground(f.host, f.canvas, f.three, "light", f.environment);
  const renderer = f.renderers[0]!;
  assert.equal(f.host.dataset.fieldState, "interactive");
  assert.equal(f.canvas.width, 450); assert.equal(f.canvas.height, 1000);
  const grass = renderer.scene!.children.find((object) => object.geometry?.instanceCount === 8000)!;
  assert.ok(grass);
  assert.ok(grass.geometry!.getAttribute("offset").count === 8000);
  f.tick(0); const start = renderer.renders;
  f.pointer(360, 800, "touch"); f.tick(16);
  assert.equal(renderer.renders, start);
  f.tick(40); assert.equal(renderer.camera!.position.x, 0);
  const event = f.pointer(360, 800); f.tick(80);
  assert.equal(event.defaultPrevented, false);
  assert.ok(renderer.camera!.position.x > 0 && renderer.camera!.position.x <= .378);
  assert.ok(renderer.camera!.position.y < 5.2);
  background.setTheme("dark");
  assert.equal(renderer.scene!.children[0]!.material!.uniforms.night!.value, 1);
  background.dispose();
});

test("hidden/offscreen states suspend renders and time; reduced motion renders a neutral static view", () => {
  const f = fixture();
  const background = mountBackground(f.host, f.canvas, f.three, "dark", f.environment);
  const renderer = f.renderers[0]!;
  f.tick(0); f.pointer(360, 800); f.tick(40);
  const elapsed = renderer.scene!.children[0]!.material!.uniforms.elapsed!;
  const oldTime = elapsed.value;
  f.hide(true); const oldRenders = renderer.renders;
  assert.equal(f.frames.size, 0);
  background.setTheme("light"); f.resize(360, 800); f.tick(10000);
  assert.equal(renderer.renders, oldRenders);
  assert.equal(elapsed.value, oldTime);
  f.hide(false); f.tick(20000); assert.equal(elapsed.value, oldTime);
  f.viewport(false); assert.equal(f.frames.size, 0);
  f.viewport(true); assert.equal(f.frames.size, 1);
  f.media.matches = true; f.media.dispatchEvent(new Event("change"));
  assert.equal(f.frames.size, 0); assert.equal(f.host.dataset.fieldState, "static");
  assert.equal(renderer.camera!.position.x, 0); assert.equal(renderer.camera!.position.y, 5.2);
  const still = renderer.renders; f.pointer(0, 0); f.tick(30000);
  assert.equal(renderer.renders, still);
  f.media.matches = false; f.media.dispatchEvent(new Event("change"));
  assert.equal(f.frames.size, 1);
  background.dispose();
});

test("WebGL loss shows the fallback and restoration renders the current theme", () => {
  const f = fixture(true);
  const background = mountBackground(f.host, f.canvas, f.three, "light", f.environment);
  const renderer = f.renderers[0]!;
  const lost = new Event("webglcontextlost", { cancelable: true });
  f.surface.dispatchEvent(lost);
  assert.equal(lost.defaultPrevented, true); assert.equal(f.host.dataset.fieldState, "fallback");
  assert.equal(f.frames.size, 0);
  const oldRenders = renderer.renders;
  background.setTheme("dark"); assert.equal(renderer.renders, oldRenders);
  f.surface.dispatchEvent(new Event("webglcontextrestored"));
  assert.equal(f.host.dataset.fieldState, "static");
  assert.ok(renderer.renders > oldRenders);
  assert.equal(renderer.scene!.children[0]!.material!.uniforms.night!.value, 1);
  background.dispose();
});

test("dispose/remount frees each shared geometry/material once, listeners, observers and buffers", () => {
  const f = fixture();
  const background = mountBackground(f.host, f.canvas, f.three, "light", f.environment);
  const renderer = f.renderers[0]!, counts = resources(renderer.scene!);
  const oldRenders = renderer.renders;
  f.host.hidden = true; f.tick(40);
  assert.equal(f.frames.size, 0); assert.equal(renderer.renders, oldRenders);
  background.dispose(); background.dispose(); background.setTheme("dark"); f.tick(100);
  assert.ok(counts.size > 10); assert.ok([...counts.values()].every((count) => count === 1));
  assert.equal(renderer.disposals, 1); assert.equal(renderer.contextLosses, 1); assert.equal(renderer.listDisposals, 1);
  assert.equal(f.windowTarget.listenerCount + f.documentTarget.listenerCount + f.media.listenerCount + f.surface.listenerCount, 0);
  assert.equal(f.disconnected, 2); assert.equal(f.canvas.width * f.canvas.height, 0);
  // The component creates a fresh canvas when enabled again; a released native context is not reused.
  const fresh = fixture();
  const next = mountBackground(fresh.host, fresh.canvas, fresh.three, "dark", fresh.environment);
  assert.notEqual(f.canvas, fresh.canvas);
  assert.equal(fresh.frames.size, 1); assert.equal(fresh.renderers.length, 1);
  next.dispose(); assert.equal(fresh.frames.size, 0);
});

test("zero-size stops work, huge displays cap pixels and breakpoint rebuild disposes old geometry", () => {
  const f = fixture();
  const background = mountBackground(f.host, f.canvas, f.three, "light", f.environment);
  const renderer = f.renderers[0]!, counts = resources(renderer.scene!);
  f.resize(0, 0); assert.equal(f.frames.size, 0); assert.equal(f.canvas.width * f.canvas.height, 0);
  f.resize(7680, 4320);
  assert.ok(f.canvas.width * f.canvas.height <= 1_600_000);
  assert.equal(f.frames.size, 1);
  assert.ok([...counts.values()].every((count) => count === 1));
  assert.ok(renderer.scene!.children.some((object) => object.geometry?.instanceCount === 16000));
  background.dispose();
});

test("renderer failure, failed construction and partial scene setup keep fallback without leaks", () => {
  const f = fixture();
  const background = mountBackground(f.host, f.canvas, f.three, "light", f.environment);
  const renderer = f.renderers[0]!, counts = resources(renderer.scene!);
  renderer.fail = true; f.tick(0);
  assert.equal(f.host.dataset.fieldState, "fallback"); assert.equal(f.frames.size, 0);
  assert.equal(f.canvas.width * f.canvas.height, 0); assert.equal(renderer.disposals, 1);
  assert.ok([...counts.values()].every((count) => count === 1));
  assert.equal(f.windowTarget.listenerCount + f.documentTarget.listenerCount + f.media.listenerCount + f.surface.listenerCount, 0);
  background.dispose();
  const missing = fixture();
  missing.three.WebGLRenderer = class { constructor() { throw new Error("WebGL unavailable"); } } as unknown as ThreeApi["WebGLRenderer"];
  mountBackground(missing.host, missing.canvas, missing.three, "light", missing.environment).dispose();
  assert.equal(missing.host.dataset.fieldState, "fallback"); assert.equal(missing.frames.size, 0);
  assert.equal(missing.windowTarget.listenerCount, 0);
  const partial = fixture();
  partial.three.InstancedBufferGeometry = class { constructor() { throw new Error("Geometry unavailable"); } } as unknown as ThreeApi["InstancedBufferGeometry"];
  mountBackground(partial.host, partial.canvas, partial.three, "light", partial.environment).dispose();
  assert.equal(partial.host.dataset.fieldState, "fallback"); assert.equal(partial.renderers[0]!.disposals, 1);
  assert.equal(partial.frames.size, 0); assert.equal(partial.disconnected, 2);
});
