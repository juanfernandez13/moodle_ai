import { test } from "node:test";
import assert from "node:assert/strict";
import { createMotionController } from "../../src/visual/owl/motion.ts";
import { createResourceScope } from "../../src/visual/owl/resources.ts";

function scheduler() {
  let nextId = 0;
  const frames = new Map<number, (time: number) => void>();
  return {
    frames,
    request(callback: (time: number) => void) { const id = ++nextId; frames.set(id, callback); return id; },
    cancel(id: number) { frames.delete(id); },
    tick(time: number) {
      const callbacks = [...frames.values()];
      frames.clear();
      for (const callback of callbacks) callback(time);
    },
  };
}

test("pausing during a blink renders a neutral pose; hidden/offscreen/reduced states have no running frames", () => {
  const clock = scheduler();
  const animated: number[] = [];
  let still = 0;
  const loop = createMotionController(clock, { paused: false, reduced: false, visible: true, inViewport: true, contextAvailable: true }, (time) => animated.push(time), () => still++);
  loop.update();
  assert.equal(clock.frames.size, 1);
  clock.tick(1000);
  clock.tick(1016);
  loop.update({ paused: true });
  assert.equal(clock.frames.size, 0);
  assert.equal(still, 1);
  clock.tick(6000);
  assert.equal(animated.length, 2);
  loop.update({ paused: false, reduced: true });
  assert.equal(clock.frames.size, 0);
  loop.update({ reduced: false, visible: false });
  const rendered = still;
  loop.renderStatic();
  assert.equal(still, rendered);
  loop.update({ visible: true, inViewport: false });
  assert.equal(clock.frames.size, 0);
  loop.update({ inViewport: true });
  assert.equal(clock.frames.size, 1);
  clock.tick(60000);
  assert.equal(animated.at(-1), 0.016);
  loop.update({ contextAvailable: false });
  assert.equal(clock.frames.size, 0);
  assert.equal(loop.renderable, false);
  loop.dispose();
  loop.update({ contextAvailable: true });
  assert.equal(clock.frames.size, 0);
});

test("resource ownership disposes shared GPU objects once, and immediately disposes late resources", () => {
  const scope = createResourceScope();
  let calls = 0;
  const shared = { dispose() { calls++; } };
  scope.own(shared);
  scope.own(shared);
  scope.dispose();
  scope.dispose();
  assert.equal(calls, 1);
  scope.own({ dispose() { calls++; } });
  assert.equal(calls, 2);
  assert.equal(scope.disposed, true);
});
