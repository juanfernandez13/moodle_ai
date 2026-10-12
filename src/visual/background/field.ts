export interface Point { x: number; y: number }

export function viewportBudget(width: number, height: number, deviceRatio: number) {
  const finite = (value: number) => Number.isFinite(value) && value > 0;
  if (!finite(width) || !finite(height) || !Number.isFinite(width * height)) return null;
  const compact = width <= 600;
  const ratio = Math.min(finite(deviceRatio) ? deviceRatio : 1, compact ? 1.25 : 1.5, Math.sqrt(1_600_000 / (width * height)));
  return {
    width, height, ratio, compact,
    pixelsWide: Math.max(1, Math.floor(width * ratio)),
    pixelsHigh: Math.max(1, Math.floor(height * ratio)),
    particleCount: compact ? 20 : 34,
    bladeCount: compact ? 8_000 : 16_000,
  };
}

export type ViewportBudget = NonNullable<ReturnType<typeof viewportBudget>>;

export function pointerPosition(x: number, y: number, width: number, height: number): Point {
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return { x: 0, y: 0 };
  return { x: Math.max(-1, Math.min(1, x / width * 2 - 1)), y: Math.max(-1, Math.min(1, y / height * 2 - 1)) };
}

export function hill(x: number, z: number, cx: number, cz: number, width: number, depth: number, rise: number) {
  return rise * Math.exp(-((x - cx) ** 2 / width ** 2 + (z - cz) ** 2 / depth ** 2));
}

/** The low valley preserves the workspace; the nearer banks give the grass volume. */
export function meadowHeight(x: number, z: number) {
  return -1.1 + hill(x, z, -29, -39, 24, 32, 8.8)
    + hill(x, z, 40, -62, 35, 36, 9.2)
    + hill(x, z, -19, 0, 13, 23, 2.8)
    + hill(x, z, 22, 7, 15, 22, 2.1)
    + Math.sin(x * .19 + z * .12) * Math.sin(z * .17) * .18;
}

export interface GrassField { offsets: Float32Array; traits: Float32Array }

/** Deterministic tufts in perspective side lanes, rather than a uniform lawn. */
export function createField(budget: ViewportBudget, aspect: number, fov: number): GrassField {
  let seed = 7193;
  const random = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
  const offsets = new Float32Array(budget.bladeCount * 3);
  const traits = new Float32Array(budget.bladeCount * 4);
  const perspective = Math.tan(fov * Math.PI / 360) * aspect;
  let centerX = 0, centerZ = 0, tuftHeight = 0;
  for (let i = 0; i < budget.bladeCount; i++) {
    if (i % 9 === 0) {
      // Most tufts sit near the camera; sparse, shorter cover recedes up the bank.
      centerZ = 9 - random() ** 1.7 * 75;
      const side = i % 18 === 0 ? -1 : 1;
      centerX = side * (.59 + random() * .52) * (18 - centerZ) * perspective;
      tuftHeight = (.24 + random() ** 1.6 * .82) * (centerZ < -28 ? .66 : 1);
    }
    const angle = random() * Math.PI * 2;
    const spread = .045 + random() * .16;
    const x = centerX + Math.cos(angle) * spread;
    const z = centerZ + Math.sin(angle) * spread;
    offsets.set([x, meadowHeight(x, z) - .025, z], i * 3);
    traits.set([tuftHeight * (.7 + random() * .5), .015 + random() * .017, angle, random()], i * 4);
  }
  return { offsets, traits };
}
