import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { mountOwl } from "../../src/visual/owl/runtime.ts";
import type { OwlEnvironment } from "../../src/visual/owl/runtime.ts";
import type { Camera, Material, OwlObject, Renderer, ThreeApi, Texture } from "../../src/visual/owl/three-types.ts";

interface ObservableResource {
  addEventListener(type: "dispose", callback: () => void): void;
}

interface SceneObject extends OwlObject {
  children: SceneObject[];
  geometry?: ObservableResource;
  material?: Material & ObservableResource;
}

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
  get listenerCount() { return [...this.listeners.values()].reduce((sum, set) => sum + set.size, 0); }
}

function fixture(reduced = false) {
  const host: { THREE?: ThreeApi & { Texture: new () => Texture & ObservableResource } } = {};
  runInNewContext(readFileSync(new URL("../../public/three-owl/three.browser.js", import.meta.url), "utf8"), { window: host, console });
  const three = host.THREE!;
  const windowTarget = new Target();
  const documentTarget = new Target();
  const media = Object.assign(new Target(), { matches: reduced });
  let hidden = false;
  let nextFrame = 0;
  const frames = new Map<number, (time: number) => void>();
  let resized: (() => void) | undefined;
  let intersected: ((visible: boolean) => void) | undefined;
  let observerDisposals = 0;
  const environment: OwlEnvironment = {
    windowTarget, documentTarget, reduced: media,
    hidden: () => hidden,
    pixelRatio: () => 3,
    scheduler: {
      request(callback) { const id = ++nextFrame; frames.set(id, callback); return id; },
      cancel(id) { frames.delete(id); },
    },
    resizeObserver(callback) {
      resized = callback;
      return { observe() {}, disconnect() { observerDisposals++; } };
    },
    intersectionObserver(callback) {
      intersected = callback;
      return { observe() {}, disconnect() { observerDisposals++; } };
    },
  };
  const children: unknown[] = [];
  const container = {
    clientWidth: 110, clientHeight: 118,
    append(child: unknown) { children.push(child); },
    getBoundingClientRect() { return { left: 0, top: 0, width: 110, height: 118, right: 110, bottom: 118 }; },
  } as unknown as HTMLDivElement;
  const renderers: FakeRenderer[] = [];
  class FakeRenderer implements Renderer {
    canvas = Object.assign(new Target(), {
      setAttribute() {},
      remove() { const index = children.indexOf(this); if (index >= 0) children.splice(index, 1); },
    });
    domElement = this.canvas as unknown as HTMLCanvasElement;
    outputColorSpace = "";
    toneMapping = 0;
    toneMappingExposure = 0;
    renderCount = 0;
    disposeCount = 0;
    contextLosses = 0;
    listDisposals = 0;
    ratios: number[] = [];
    size: number[] = [];
    scene?: SceneObject;
    renderLists = { dispose: () => { this.listDisposals++; } };
    constructor() { renderers.push(this); }
    setPixelRatio(ratio: number) { this.ratios.push(ratio); }
    setSize(width: number, height: number) { this.size = [width, height]; }
    render(scene: OwlObject, camera: Camera) {
      this.scene = scene as SceneObject;
      assert.equal(camera.aspect, container.clientWidth / container.clientHeight);
      this.renderCount++;
    }
    dispose() { this.disposeCount++; }
    forceContextLoss() { this.contextLosses++; }
  }
  three.WebGLRenderer = FakeRenderer;
  const textures: { texture: Texture & ObservableResource; loaded: (texture: Texture) => void; url: string }[] = [];
  three.TextureLoader = class {
    load(url: string, loaded: (texture: Texture) => void) {
      const texture = new three.Texture();
      textures.push({ texture, loaded, url });
      return texture;
    }
  };
  return {
    three, container, environment, windowTarget, documentTarget, media, frames, children, renderers, textures,
    get observerDisposals() { return observerDisposals; },
    resize() { resized?.(); },
    viewport(visible: boolean) { intersected?.(visible); },
    hide(next: boolean) { hidden = next; documentTarget.dispatchEvent(new Event("visibilitychange")); },
    tick(time: number) {
      const callbacks = [...frames.values()];
      frames.clear();
      for (const callback of callbacks) callback(time);
    },
  };
}

function observeResources(scene: SceneObject) {
  const counts = new Map<ObservableResource, number>();
  function visit(object: SceneObject) {
    for (const resource of [object.geometry, object.material]) {
      if (resource && !counts.has(resource)) {
        counts.set(resource, 0);
        resource.addEventListener("dispose", () => counts.set(resource, counts.get(resource)! + 1));
      }
    }
    for (const child of object.children) visit(child);
  }
  visit(scene);
  return counts;
}

test("actual local model renders, pauses outside viewport/hidden/reduced, and restores its SVG on WebGL loss", () => {
  const f = fixture();
  const availability: boolean[] = [];
  const owl = mountOwl(f.container, f.three, { paused: false, theme: "light" }, (ready) => availability.push(ready), f.environment);
  const renderer = f.renderers[0]!;
  assert.deepEqual(renderer.size, [110, 118]);
  assert.ok(renderer.ratios.every((ratio) => ratio === 1.5));
  assert.equal(f.children.length, 1);
  assert.deepEqual(availability, [true]);
  assert.equal(f.textures[0]!.url, "/three-owl/moodle-mark.svg");
  f.tick(0);
  f.tick(16);
  assert.equal(f.frames.size, 1);
  f.viewport(false);
  const rendersOffscreen = renderer.renderCount;
  assert.equal(f.frames.size, 0);
  f.resize();
  f.textures[0]!.loaded(f.textures[0]!.texture);
  assert.equal(renderer.renderCount, rendersOffscreen);
  f.viewport(true);
  assert.equal(f.frames.size, 1);
  f.hide(true);
  assert.equal(f.frames.size, 0);
  f.hide(false);
  assert.equal(f.frames.size, 1);
  f.media.matches = true;
  f.media.dispatchEvent(new Event("change"));
  assert.equal(f.frames.size, 0);
  assert.equal(renderer.scene!.children[3]!.rotation.y, -0.07);
  renderer.canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
  assert.deepEqual(availability, [true, false]);
  assert.equal(f.frames.size, 0);
  renderer.canvas.dispatchEvent(new Event("webglcontextrestored"));
  assert.deepEqual(availability, [true, false, true]);
  assert.equal(f.frames.size, 0);
  owl.dispose();
});

test("unmount/StrictMode remount releases every resource once and late texture callbacks do not render", () => {
  const f = fixture();
  const first = mountOwl(f.container, f.three, { paused: false, theme: "light" }, () => {}, f.environment);
  const renderer = f.renderers[0]!;
  const resources = observeResources(renderer.scene!);
  let textureDisposals = 0;
  f.textures[0]!.texture.addEventListener("dispose", () => textureDisposals++);
  const before = renderer.renderCount;
  first.dispose();
  first.dispose();
  first.update({ paused: false, theme: "dark" });
  f.textures[0]!.loaded(f.textures[0]!.texture);
  f.tick(100);
  assert.equal(renderer.renderCount, before);
  assert.equal(f.frames.size, 0);
  assert.equal(f.children.length, 0);
  assert.equal(f.observerDisposals, 2);
  assert.equal(f.windowTarget.listenerCount + f.documentTarget.listenerCount + f.media.listenerCount + renderer.canvas.listenerCount, 0);
  assert.equal(renderer.disposeCount, 1);
  assert.equal(renderer.contextLosses, 1);
  assert.equal(renderer.listDisposals, 1);
  assert.equal(textureDisposals, 1);
  assert.ok(resources.size > 25);
  assert.ok([...resources.values()].every((count) => count === 1));
  const second = mountOwl(f.container, f.three, { paused: true, theme: "dark" }, () => {}, f.environment);
  assert.equal(f.children.length, 1);
  assert.equal(f.frames.size, 0);
  assert.ok(f.renderers[1]!.renderCount > 0);
  second.dispose();
  assert.equal(f.children.length, 0);
});

test("missing WebGL and partial model setup do not leave canvases, frames or listeners", () => {
  const f = fixture();
  f.three.WebGLRenderer = class { constructor() { throw new Error("WebGL unavailable"); } } as unknown as ThreeApi["WebGLRenderer"];
  assert.throws(() => mountOwl(f.container, f.three, { paused: false, theme: "light" }, () => {}, f.environment), /WebGL unavailable/);
  assert.equal(f.children.length, 0);
  assert.equal(f.frames.size, 0);
  const broken = fixture();
  broken.three.TextureLoader = class { load() { throw new Error("Texture unavailable"); } } as unknown as ThreeApi["TextureLoader"];
  assert.throws(() => mountOwl(broken.container, broken.three, { paused: false, theme: "light" }, () => {}, broken.environment), /Texture unavailable/);
  assert.equal(broken.children.length, 0);
  assert.equal(broken.frames.size, 0);
  assert.equal(broken.windowTarget.listenerCount + broken.documentTarget.listenerCount, 0);
  assert.equal(broken.renderers[0]!.disposeCount, 1);
});
