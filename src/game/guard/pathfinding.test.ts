import { describe, expect, it } from "vitest";
import { LevelGrid } from "../level/grid";
import { LEVEL_01 } from "../level/levels";
import { parseLevel, type GridPoint } from "../level/parseLevel";
import { GUARDS } from "./guardConfig";
import { findPath } from "./pathfinding";

function gridOf(rows: string[]): LevelGrid {
  return new LevelGrid(parseLevel(rows));
}

/** Every step moves to an adjacent walkable tile (8-neighbourhood) without cutting a corner. */
function expectValidPath(grid: LevelGrid, start: GridPoint, path: GridPoint[]): void {
  let previous = start;
  for (const step of path) {
    const dc = step.col - previous.col;
    const dr = step.row - previous.row;
    expect(Math.max(Math.abs(dc), Math.abs(dr)), JSON.stringify(step)).toBe(1);
    expect(grid.isWalkable(step.col, step.row)).toBe(true);
    if (dc !== 0 && dr !== 0) {
      expect(grid.isWalkable(previous.col + dc, previous.row)).toBe(true);
      expect(grid.isWalkable(previous.col, previous.row + dr)).toBe(true);
    }
    previous = step;
  }
}

describe("findPath", () => {
  const open = gridOf(["#######", "#P....#", "#.....#", "#.....#", "#######"]);

  it("returns [] when already at the goal", () => {
    expect(findPath({ col: 2, row: 2 }, { col: 2, row: 2 }, open.isWalkable)).toEqual([]);
  });

  it("walks straight across open floor", () => {
    expect(findPath({ col: 1, row: 1 }, { col: 4, row: 1 }, open.isWalkable)).toEqual([
      { col: 2, row: 1 },
      { col: 3, row: 1 },
      { col: 4, row: 1 },
    ]);
  });

  it("uses diagonals in the open", () => {
    expect(findPath({ col: 1, row: 1 }, { col: 3, row: 3 }, open.isWalkable)).toHaveLength(2);
  });

  it("goes around a wall through the only gap", () => {
    const grid = gridOf(["#######", "#P.#..#", "#..#..#", "#.....#", "#######"]);
    const start = { col: 1, row: 1 };
    const path = findPath(start, { col: 5, row: 1 }, grid.isWalkable)!;
    expect(path).not.toBeNull();
    expect(path.some((step) => step.row === 3 && step.col === 3)).toBe(true);
    expectValidPath(grid, start, path);
  });

  it("never cuts a wall corner diagonally", () => {
    // Moving from (1,2) to (2,1) diagonally would clip the wall at (1,1)... and (2,2).
    const grid = gridOf(["####", "##.#", "#P##", "####"]);
    expect(findPath({ col: 1, row: 2 }, { col: 2, row: 1 }, grid.isWalkable)).toBeNull();
  });

  it("returns null for unreachable goals and for walls", () => {
    const grid = gridOf(["#######", "#P.#..#", "#######"]);
    expect(findPath({ col: 1, row: 1 }, { col: 5, row: 1 }, grid.isWalkable)).toBeNull();
    expect(findPath({ col: 1, row: 1 }, { col: 3, row: 1 }, grid.isWalkable)).toBeNull();
  });
});

describe.each(GUARDS.map((guard) => [guard.id, guard] as const))("LEVEL_01 navigation for %s", (_id, guard) => {
  const grid = new LevelGrid(parseLevel(LEVEL_01));
  const route = guard.patrolRoute;

  it("has every patrol waypoint on a walkable tile", () => {
    for (const point of route) expect(grid.isWalkable(point.col, point.row), JSON.stringify(point)).toBe(true);
  });

  it("can walk the whole patrol loop", () => {
    route.forEach((from, index) => {
      const to = route[(index + 1) % route.length];
      const path = findPath(from, to, grid.isWalkable);
      expect(path, `${JSON.stringify(from)} → ${JSON.stringify(to)}`).not.toBeNull();
      expectValidPath(grid, from, path!);
    });
  });

  it("can reach the player's spawn from its patrol route", () => {
    const level = parseLevel(LEVEL_01);
    const path = findPath(route[0], level.playerSpawn, grid.isWalkable)!;
    expect(path).not.toBeNull();
    expectValidPath(grid, route[0], path);
  });
});
