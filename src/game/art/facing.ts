// Which way a character sprite faces. Pure TypeScript (visual only: never used by game logic).

export type Facing = "down" | "up" | "left" | "right";

export const FACINGS: readonly Facing[] = ["down", "up", "left", "right"];

/**
 * Facing from a velocity: the dominant axis wins, and exact diagonals face sideways.
 * When standing still the previous facing is kept, so a character doesn't snap back to "down".
 */
export function facingFromVelocity(vx: number, vy: number, previous: Facing): Facing {
  if (vx === 0 && vy === 0) return previous;
  if (Math.abs(vy) > Math.abs(vx)) return vy > 0 ? "down" : "up";
  return vx > 0 ? "right" : "left";
}

/** Facing from an angle in radians (0 = east, π/2 = south, as in the guards' view direction). */
export function facingFromAngle(angle: number): Facing {
  return facingFromVelocity(Math.cos(angle), Math.sin(angle), "down");
}
