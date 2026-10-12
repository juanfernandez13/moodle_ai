import { createOwlModel } from "./model.ts";
import { createMotionController } from "./motion.ts";
import { createResourceScope } from "./resources.ts";
import type { FrameScheduler } from "./motion.ts";
import type { Renderer, ThreeApi } from "./three-types.ts";

export interface OwlOptions {
  paused: boolean;
  theme: "light" | "dark";
}

export interface OwlHandle {
  update(options: OwlOptions): void;
  dispose(): void;
}

interface Observer {
  observe(element: Element): void;
  disconnect(): void;
}

export interface OwlEnvironment {
  windowTarget: EventTarget;
  documentTarget: EventTarget;
  hidden(): boolean;
  pixelRatio(): number;
  reduced: { matches: boolean; addEventListener(type: "change", listener: EventListener): void; removeEventListener(type: "change", listener: EventListener): void };
  scheduler: FrameScheduler;
  resizeObserver?(callback: () => void): Observer;
  intersectionObserver?(callback: (inViewport: boolean) => void): Observer;
}

function browserEnvironment(): OwlEnvironment {
  return {
    windowTarget: window,
    documentTarget: document,
    hidden: () => document.hidden,
    pixelRatio: () => window.devicePixelRatio || 1,
    reduced: window.matchMedia("(prefers-reduced-motion: reduce)"),
    scheduler: { request: (callback) => requestAnimationFrame(callback), cancel: (id) => cancelAnimationFrame(id) },
    ...(typeof ResizeObserver === "undefined" ? {} : { resizeObserver: (callback: () => void) => new ResizeObserver(callback) }),
    ...(typeof IntersectionObserver === "undefined" ? {} : {
      intersectionObserver: (callback: (inViewport: boolean) => void) => new IntersectionObserver((entries) => callback(entries.some((entry) => entry.isIntersecting))),
    }),
  };
}

/** A mount owns its canvas, listeners, observers, animation and GPU resources. */
export function mountOwl(
  container: HTMLDivElement,
  THREE: ThreeApi,
  initial: OwlOptions,
  ready: (available: boolean) => void,
  environment: OwlEnvironment = browserEnvironment(),
): OwlHandle {
  const scope = createResourceScope();
  const cleanups: (() => void)[] = [];
  let renderer: Renderer | undefined;
  let disposed = false;
  let available = false;
  let options = initial;
  let lookX = 0, lookY = 0, hovered = false;
  let controller: ReturnType<typeof createMotionController> | undefined;
  function setReady(next: boolean) {
    if (available === next) return;
    available = next;
    ready(next);
  }
  function listen(target: EventTarget, type: string, callback: EventListener, passive = false) {
    target.addEventListener(type, callback, { passive });
    cleanups.push(() => target.removeEventListener(type, callback));
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    controller?.dispose();
    for (const cleanup of cleanups.splice(0)) cleanup();
    scope.dispose();
    renderer?.renderLists?.dispose();
    renderer?.dispose();
    renderer?.forceContextLoss();
    renderer?.domElement.remove();
  }
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    const activeRenderer = renderer;
    activeRenderer.setPixelRatio(Math.min(environment.pixelRatio(), 1.5));
    activeRenderer.outputColorSpace = THREE.SRGBColorSpace;
    activeRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    activeRenderer.toneMappingExposure = 1.02;
    activeRenderer.domElement.setAttribute("aria-hidden", "true");
    container.append(activeRenderer.domElement);
    const model = createOwlModel(THREE, scope, () => {
      if (controller?.renderable) render();
    });
    model.setTheme(options.theme);
    function render() {
      if (disposed || !container.clientWidth || !container.clientHeight) return;
      try {
        activeRenderer.render(model.scene, model.camera);
        setReady(true);
      } catch {
        controller?.update({ contextAvailable: false });
        setReady(false);
      }
    }
    controller = createMotionController(environment.scheduler, {
      paused: options.paused,
      reduced: environment.reduced.matches,
      visible: !environment.hidden(),
      inViewport: true,
      contextAvailable: true,
    }, (elapsed, dt) => {
      model.animate(elapsed, dt, lookX, lookY, hovered);
      render();
    }, () => {
      model.resetPose();
      render();
    });
    const motion = controller;
    function resize() {
      if (disposed || !container.clientWidth || !container.clientHeight) return;
      activeRenderer.setPixelRatio(Math.min(environment.pixelRatio(), 1.5));
      activeRenderer.setSize(container.clientWidth, container.clientHeight, false);
      model.camera.aspect = container.clientWidth / container.clientHeight;
      model.camera.updateProjectionMatrix();
      if (motion.renderable) render();
    }
    listen(environment.windowTarget, "pointermove", (event) => {
      if (!motion.moving) return;
      const pointer = event as PointerEvent;
      if (pointer.pointerType === "touch") return;
      const bounds = container.getBoundingClientRect();
      lookX = Math.max(-1, Math.min(1, (pointer.clientX - bounds.left - bounds.width / 2) / 300));
      lookY = Math.max(-1, Math.min(1, (bounds.top + bounds.height / 2 - pointer.clientY) / 260));
      hovered = pointer.clientX >= bounds.left && pointer.clientX <= bounds.right && pointer.clientY >= bounds.top && pointer.clientY <= bounds.bottom;
    }, true);
    listen(environment.windowTarget, "pointerout", (event) => {
      if (!(event as PointerEvent).relatedTarget) { lookX = lookY = 0; hovered = false; }
    }, true);
    listen(environment.documentTarget, "visibilitychange", () => motion.update({ visible: !environment.hidden() }));
    const reducedChanged: EventListener = () => motion.update({ reduced: environment.reduced.matches });
    environment.reduced.addEventListener("change", reducedChanged);
    cleanups.push(() => environment.reduced.removeEventListener("change", reducedChanged));
    listen(activeRenderer.domElement, "webglcontextlost", (event) => {
      event.preventDefault();
      motion.update({ contextAvailable: false });
      setReady(false);
    });
    listen(activeRenderer.domElement, "webglcontextrestored", () => {
      motion.update({ contextAvailable: true });
      resize();
    });
    const resizeWatch = environment.resizeObserver?.(resize);
    resizeWatch?.observe(container);
    if (resizeWatch) cleanups.push(() => resizeWatch.disconnect());
    else listen(environment.windowTarget, "resize", resize, true);
    const viewportWatch = environment.intersectionObserver?.((inViewport) => motion.update({ inViewport }));
    viewportWatch?.observe(container);
    if (viewportWatch) cleanups.push(() => viewportWatch.disconnect());
    resize();
    motion.update();
    return {
      update(next) {
        if (disposed) return;
        options = next;
        model.setTheme(next.theme);
        motion.update({ paused: next.paused });
        if (motion.renderable && motion.moving) render();
      },
      dispose,
    };
  } catch (error) {
    dispose();
    setReady(false);
    throw error;
  }
}
