import { test } from "node:test";
import assert from "node:assert/strict";
import { createField, pointerPosition, viewportBudget } from "../../src/visual/background/field.ts";

test("360px displays cap DPR and scene work; large and unusual viewports never exceed the pixel budget", () => {
  const mobile = viewportBudget(360, 800, 4)!;
  assert.ok(mobile.ratio <= 1.25);
  assert.ok(mobile.particleCount <= 12);
  assert.ok(mobile.bladeCount <= 30);
  for (const [width, height, ratio] of [[1280, 900, 2], [7680, 4320, 4], [100000, 100000, 50], [360, 800, NaN], [600, 1000, 0]]) {
    const budget = viewportBudget(width!, height!, ratio!)!;
    assert.ok(budget.pixelsWide * budget.pixelsHigh <= 1_600_000);
    assert.ok(budget.pixelsWide >= 1 && budget.pixelsHigh >= 1);
    assert.ok(budget.ratio > 0 && Number.isFinite(budget.ratio));
    assert.ok(budget.particleCount <= 24 && budget.bladeCount <= 56);
  }
  for (const [width, height] of [[0, 800], [360, -1], [Infinity, 800], [NaN, 800], [Number.MAX_VALUE, Number.MAX_VALUE]]) {
    assert.equal(viewportBudget(width!, height!, 2), null);
  }
});

test("pointer values stay bounded and particles/vegetation leave the central reading region clear", () => {
  assert.deepEqual(pointerPosition(-10000, 10000, 360, 800), { x: -1, y: 1 });
  assert.deepEqual(pointerPosition(180, 400, 360, 800), { x: 0, y: 0 });
  assert.deepEqual(pointerPosition(NaN, 10, 360, 800), { x: 0, y: 0 });
  const field = createField(viewportBudget(360, 800, 2)!);
  for (const entity of [...field.particles, ...field.blades]) {
    assert.ok(entity.x < 0.2 || entity.x > 0.8);
    assert.ok(Number.isFinite(entity.x) && Number.isFinite(entity.y));
  }
});
