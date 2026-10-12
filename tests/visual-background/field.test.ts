import { test } from "node:test";
import assert from "node:assert/strict";
import { createField, meadowHeight, pointerPosition, viewportBudget } from "../../src/visual/background/field.ts";

test("360px caps DPR and geometry work; large/unusual displays stay within the pixel budget", () => {
  const mobile = viewportBudget(360, 800, 4)!;
  assert.ok(mobile.ratio <= 1.25 && mobile.bladeCount <= 8000 && mobile.particleCount <= 20);
  for (const [width, height, ratio] of [[1280, 900, 2], [7680, 4320, 4], [100000, 100000, 50], [360, 800, NaN], [600, 1000, 0]]) {
    const b = viewportBudget(width!, height!, ratio!)!;
    assert.ok(b.pixelsWide * b.pixelsHigh <= 1_600_000);
    assert.ok(b.pixelsWide >= 1 && b.pixelsHigh >= 1 && Number.isFinite(b.ratio));
    assert.ok(b.bladeCount <= 16000 && b.particleCount <= 34);
  }
  for (const [width, height] of [[0, 800], [360, -1], [Infinity, 800], [NaN, 800], [Number.MAX_VALUE, Number.MAX_VALUE]]) {
    assert.equal(viewportBudget(width!, height!, 2), null);
  }
});

test("bounded pointer input and perspective tufts protect the center and stay rooted on actual terrain", () => {
  assert.deepEqual(pointerPosition(-10000, 10000, 360, 800), { x: -1, y: 1 });
  assert.deepEqual(pointerPosition(180, 400, 360, 800), { x: 0, y: 0 });
  assert.deepEqual(pointerPosition(NaN, 10, 360, 800), { x: 0, y: 0 });
  for (const [width, height, fov] of [[360, 800, 52], [1440, 900, 44]]) {
    const b = viewportBudget(width!, height!, 2)!;
    const field = createField(b, width! / height!, fov!);
    assert.equal(field.offsets.length, b.bladeCount * 3);
    const perspective = Math.tan(fov! * Math.PI / 360) * width! / height!;
    for (let i = 0; i < b.bladeCount; i++) {
      const x = field.offsets[i * 3]!, y = field.offsets[i * 3 + 1]!, z = field.offsets[i * 3 + 2]!;
      assert.ok(Math.abs(x / ((18 - z) * perspective)) > .45);
      assert.ok(Math.abs(y - (meadowHeight(x, z) - .025)) < .00001);
      assert.ok(Number.isFinite(field.traits[i * 4]!) && field.traits[i * 4]! > 0);
    }
  }
});
