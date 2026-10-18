// Pure TypeScript: no Phaser imports, so this can be unit-tested in Node.

/** A 2D point or direction in internal pixels. Screen coordinates: +y is down. */
export interface Vector {
  x: number;
  y: number;
}

export function distance(a: Vector, b: Vector): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Angle in radians of the direction from `from` to `to` (0 = east, π/2 = south). */
export function angleBetween(from: Vector, to: Vector): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

/** Wraps an angle into (-π, π]. */
export function normalizeAngle(angle: number): number {
  let a = angle % (2 * Math.PI);
  if (a <= -Math.PI) a += 2 * Math.PI;
  if (a > Math.PI) a -= 2 * Math.PI;
  return a;
}

/** Rotates `current` toward `target` by at most `maxStep` radians, the short way round. */
export function turnToward(current: number, target: number, maxStep: number): number {
  const diff = normalizeAngle(target - current);
  if (Math.abs(diff) <= maxStep) return normalizeAngle(target);
  return normalizeAngle(current + Math.sign(diff) * maxStep);
}
