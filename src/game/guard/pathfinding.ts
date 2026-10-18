// Pure TypeScript: no Phaser imports, so this can be unit-tested in Node.
import type { GridPoint } from "../level/parseLevel";

export type IsWalkable = (col: number, row: number) => boolean;

// Straight moves first, so ties prefer straight lines over diagonals.
const NEIGHBOURS: readonly [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/**
 * Breadth-first search on the tile grid with 8-directional moves. A diagonal move is allowed only
 * if both tiles beside it are walkable, so paths never cut wall corners.
 *
 * Returns the tiles to walk through, excluding `start` and including `goal` ([] if already there),
 * or null if the goal is a wall or cannot be reached.
 */
export function findPath(start: GridPoint, goal: GridPoint, isWalkable: IsWalkable): GridPoint[] | null {
  if (!isWalkable(start.col, start.row) || !isWalkable(goal.col, goal.row)) return null;
  if (start.col === goal.col && start.row === goal.row) return [];

  const key = (col: number, row: number) => `${col},${row}`;
  const cameFrom = new Map<string, GridPoint | null>([[key(start.col, start.row), null]]);
  const queue: GridPoint[] = [start];

  for (let head = 0; head < queue.length; head++) {
    const current = queue[head];
    for (const [dc, dr] of NEIGHBOURS) {
      const col = current.col + dc;
      const row = current.row + dr;
      if (cameFrom.has(key(col, row)) || !isWalkable(col, row)) continue;
      if (dc !== 0 && dr !== 0 && (!isWalkable(current.col + dc, current.row) || !isWalkable(current.col, current.row + dr))) {
        continue;
      }
      const next = { col, row };
      cameFrom.set(key(col, row), current);
      if (col === goal.col && row === goal.row) return reconstruct(cameFrom, next, key);
      queue.push(next);
    }
  }
  return null;
}

function reconstruct(
  cameFrom: Map<string, GridPoint | null>,
  goal: GridPoint,
  key: (col: number, row: number) => string,
): GridPoint[] {
  const path: GridPoint[] = [];
  for (let node: GridPoint | null = goal; node; node = cameFrom.get(key(node.col, node.row)) ?? null) {
    path.push(node);
  }
  path.pop(); // drop the start tile
  return path.reverse();
}
