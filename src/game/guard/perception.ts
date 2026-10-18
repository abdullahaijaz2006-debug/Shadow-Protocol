// Pure TypeScript: no Phaser imports, so this can be unit-tested in Node.
import { TILE_SIZE } from "../constants";
import { angleBetween, distance, normalizeAngle, type Vector } from "../geometry";

/** Is the tile at (col, row) solid (blocks sight)? Must return true outside the map. */
export type IsSolid = (col: number, row: number) => boolean;

export interface VisionConfig {
  /** How far the guard can see, in pixels. */
  readonly radius: number;
  /** Total width of the field of view, in radians. */
  readonly fovRadians: number;
}

/**
 * Casts a ray from `origin` in direction `angle` through the tile grid and returns the distance
 * to the first solid tile, or `maxDistance` if none is hit within it. Uses the Amanatides–Woo grid
 * traversal, which visits every tile the ray passes through, so thin walls are never skipped.
 */
export function castRay(origin: Vector, angle: number, maxDistance: number, isSolid: IsSolid): number {
  let col = Math.floor(origin.x / TILE_SIZE);
  let row = Math.floor(origin.y / TILE_SIZE);
  if (isSolid(col, row)) return 0;

  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const stepCol = dx > 0 ? 1 : -1;
  const stepRow = dy > 0 ? 1 : -1;
  // Distance along the ray between successive vertical / horizontal grid lines.
  const deltaX = dx !== 0 ? Math.abs(TILE_SIZE / dx) : Infinity;
  const deltaY = dy !== 0 ? Math.abs(TILE_SIZE / dy) : Infinity;
  // Distance along the ray to the first vertical / horizontal grid line.
  let nextX = dx !== 0 ? ((dx > 0 ? (col + 1) * TILE_SIZE : col * TILE_SIZE) - origin.x) / dx : Infinity;
  let nextY = dy !== 0 ? ((dy > 0 ? (row + 1) * TILE_SIZE : row * TILE_SIZE) - origin.y) / dy : Infinity;

  for (;;) {
    const t = Math.min(nextX, nextY);
    if (t >= maxDistance) return maxDistance;
    if (nextX < nextY) {
      col += stepCol;
      nextX += deltaX;
    } else {
      row += stepRow;
      nextY += deltaY;
    }
    if (isSolid(col, row)) return t;
  }
}

/** True if the straight segment from `from` to `to` crosses no solid tile. */
export function hasLineOfSight(from: Vector, to: Vector, isSolid: IsSolid): boolean {
  const length = distance(from, to);
  return castRay(from, angleBetween(from, to), length, isSolid) >= length;
}

/** True if `target` is within the vision radius, inside the field of view, and not behind a wall. */
export function canSee(eye: Vector, facing: number, target: Vector, vision: VisionConfig, isSolid: IsSolid): boolean {
  const length = distance(eye, target);
  if (length > vision.radius) return false;
  if (length === 0) return true;
  if (Math.abs(normalizeAngle(angleBetween(eye, target) - facing)) > vision.fovRadians / 2) return false;
  return hasLineOfSight(eye, target, isSolid);
}

/**
 * Outline of the visible area for drawing: `rayCount + 1` points across the field of view, each
 * where a ray stops at a wall or at the vision radius. Draw it as a fan from `eye`.
 */
export function visionPolygon(
  eye: Vector,
  facing: number,
  vision: VisionConfig,
  isSolid: IsSolid,
  rayCount = 32,
): Vector[] {
  const points: Vector[] = [];
  for (let i = 0; i <= rayCount; i++) {
    const angle = facing - vision.fovRadians / 2 + (vision.fovRadians * i) / rayCount;
    const reach = castRay(eye, angle, vision.radius, isSolid);
    points.push({ x: eye.x + Math.cos(angle) * reach, y: eye.y + Math.sin(angle) * reach });
  }
  return points;
}
