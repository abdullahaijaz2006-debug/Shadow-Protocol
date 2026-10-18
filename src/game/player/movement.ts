// Pure TypeScript: no Phaser imports, so this can be unit-tested in Node.
import type { Vector } from "../geometry";

export type { Vector };

/** Which movement directions are currently held. */
export interface MovementInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

/**
 * Unit direction from the held keys, or (0, 0) when idle. Opposite keys cancel out, and diagonals
 * are normalized to length 1 so moving diagonally is not √2 times faster. Screen coordinates: +y is down.
 */
export function movementDirection(input: MovementInput): Vector {
  const x = Number(input.right) - Number(input.left);
  const y = Number(input.down) - Number(input.up);
  if (x === 0 && y === 0) return { x: 0, y: 0 };
  const length = Math.hypot(x, y);
  return { x: x / length, y: y / length };
}

/** Velocity in pixels per second for the held keys at the given speed. */
export function movementVelocity(input: MovementInput, speed: number): Vector {
  const direction = movementDirection(input);
  return { x: direction.x * speed, y: direction.y * speed };
}
