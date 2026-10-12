export interface Point {
  x: number;
  y: number;
}

export function viewportBudget(width: number, height: number, deviceRatio: number) {
  const finite = (value: number) => Number.isFinite(value) && value > 0;
  if (!finite(width) || !finite(height) || !Number.isFinite(width * height)) return null;
  const compact = width <= 600;
  const maxRatio = compact ? 1.25 : 1.5;
  const device = finite(deviceRatio) ? deviceRatio : 1;
  const ratio = Math.min(device, maxRatio, Math.sqrt(1_600_000 / (width * height)));
  return {
    width, height, ratio,
    pixelsWide: Math.max(1, Math.floor(width * ratio)),
    pixelsHigh: Math.max(1, Math.floor(height * ratio)),
    particleCount: compact ? 12 : 24,
    bladeCount: compact ? 30 : 56,
  };
}

export type ViewportBudget = NonNullable<ReturnType<typeof viewportBudget>>;

/** Invalid/outside positions cannot expand depth motion or canvas work. */
export function pointerPosition(x: number, y: number, width: number, height: number): Point {
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return { x: 0, y: 0 };
  return {
    x: Math.max(-1, Math.min(1, x / width * 2 - 1)),
    y: Math.max(-1, Math.min(1, y / height * 2 - 1)),
  };
}

interface Particle extends Point {
  phase: number;
  depth: number;
  radius: number;
}

interface Blade extends Point {
  phase: number;
  height: number;
  lean: number;
  thickness: number;
}

export interface Field {
  particles: Particle[];
  blades: Blade[];
}

/** Reproducible irregular clusters confined to the sides of the work surface. */
export function createField(budget: ViewportBudget): Field {
  let seed = 7919;
  function random() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  const particles = Array.from({ length: budget.particleCount }, (_, i) => ({
    x: i % 2 ? 0.85 + random() * 0.14 : random() * 0.15,
    y: 0.26 + random() * 0.56,
    phase: random() * Math.PI * 2,
    depth: 0.5 + random() * 0.5,
    radius: 0.8 + random() * 1.4,
  }));
  const compact = budget.width <= 600;
  const blades = Array.from({ length: budget.bladeCount }, (_, i) => ({
    x: i % 2 ? 0.81 + random() * 0.19 : random() * 0.19,
    y: 0.97 + random() * 0.05,
    phase: random() * Math.PI * 2,
    height: (compact ? 14 : 22) + random() * (compact ? 29 : 48),
    lean: random() * 0.45 - 0.225,
    thickness: 0.65 + random() * 1.1,
  }));
  return { particles, blades };
}

export function drawField(context: CanvasRenderingContext2D, field: Field, budget: ViewportBudget, point: Point, elapsed: number, dark: boolean) {
  const { width, height, ratio } = budget;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  const cursorX = (point.x + 1) * width / 2;
  const cursorY = (point.y + 1) * height / 2;
  for (const blade of field.blades) {
    const x = blade.x * width;
    const y = blade.y * height;
    const distance = Math.hypot(x - cursorX, y - cursorY);
    const response = Math.max(0, 1 - distance / 160) * point.x * 0.19;
    const sway = Math.sin(elapsed * 0.72 + blade.phase) * 0.028 + response;
    const bend = (blade.lean + sway) * blade.height;
    context.beginPath();
    context.moveTo(x, y);
    context.quadraticCurveTo(x + bend * 0.25, y - blade.height * 0.58, x + bend, y - blade.height);
    context.strokeStyle = dark ? "rgba(120, 166, 134, 0.24)" : "rgba(64, 110, 66, 0.23)";
    context.lineWidth = blade.thickness;
    context.stroke();
  }
  for (const particle of field.particles) {
    const baseX = particle.x * width;
    const baseY = particle.y * height;
    const dx = baseX - cursorX;
    const dy = baseY - cursorY;
    const distance = Math.hypot(dx, dy);
    const response = Math.max(0, 1 - distance / 140) * 7;
    const x = baseX + Math.sin(elapsed * 0.27 + particle.phase) * 6 * particle.depth + (distance ? dx / distance * response : 0);
    const y = baseY + Math.cos(elapsed * 0.21 + particle.phase) * 8 * particle.depth + (distance ? dy / distance * response : 0);
    const pulse = 0.65 + Math.sin(elapsed * 0.8 + particle.phase) * 0.15;
    context.beginPath();
    context.arc(x, y, particle.radius, 0, Math.PI * 2);
    context.fillStyle = dark ? `rgba(227, 255, 176, ${pulse * 0.7})` : `rgba(245, 252, 204, ${pulse * 0.34})`;
    context.fill();
  }
}
