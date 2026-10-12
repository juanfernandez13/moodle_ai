export interface MotionState {
  paused: boolean;
  reduced: boolean;
  visible: boolean;
  inViewport: boolean;
  contextAvailable: boolean;
}

export interface FrameScheduler {
  request(callback: (time: number) => void): number;
  cancel(id: number): void;
}

/** One cancellable loop; resuming never advances time spent in a hidden tab. */
export function createMotionController(
  scheduler: FrameScheduler,
  initial: MotionState,
  animate: (elapsed: number, dt: number) => void,
  staticFrame: () => void,
) {
  let state = { ...initial };
  let frame: number | null = null;
  let last: number | null = null;
  let elapsed = 0;
  let disposed = false;
  const canAnimate = () => !disposed && !state.paused && !state.reduced && state.visible && state.inViewport && state.contextAvailable;
  const canRender = () => !disposed && state.visible && state.inViewport && state.contextAvailable;
  function tick(time: number) {
    frame = null;
    if (!canAnimate()) return;
    const dt = last === null ? 0 : Math.min(Math.max((time - last) / 1000, 0), 0.05);
    last = time;
    elapsed += dt;
    animate(elapsed, dt);
    if (canAnimate()) frame = scheduler.request(tick);
  }
  function cancel() {
    if (frame !== null) scheduler.cancel(frame);
    frame = null;
    last = null;
  }
  return {
    get moving() { return canAnimate(); },
    get renderable() { return canRender(); },
    update(next: Partial<MotionState> = {}) {
      if (disposed) return;
      state = { ...state, ...next };
      cancel();
      if (canAnimate()) frame = scheduler.request(tick);
      else if (canRender()) staticFrame();
    },
    renderStatic() { if (canRender()) staticFrame(); },
    dispose() { disposed = true; cancel(); },
  };
}
