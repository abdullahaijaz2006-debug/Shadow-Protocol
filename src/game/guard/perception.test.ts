import { describe, expect, it } from "vitest";
import { TILE_SIZE } from "../constants";
import { distance, normalizeAngle, turnToward } from "../geometry";
import { LevelGrid } from "../level/grid";
import { parseLevel } from "../level/parseLevel";
import { canSee, castRay, hasLineOfSight, visionPolygon, type VisionConfig } from "./perception";

// Columns 0..8; a single wall tile at (4, 2).
const grid = new LevelGrid(
  parseLevel([
    "#########", // row 0
    "#.......#", // row 1
    "#...#...#", // row 2
    "#P......#", // row 3
    "#########", // row 4
  ]),
);
const at = (col: number, row: number) => grid.tileCenter({ col, row });
const VISION: VisionConfig = { radius: 96, fovRadians: Math.PI / 2 };
const DEG = Math.PI / 180;

describe("castRay", () => {
  it("stops at the first wall: from (1,1) east to the wall at column 8", () => {
    expect(castRay(at(1, 1), 0, 500, grid.isSolid)).toBeCloseTo(8 * TILE_SIZE - at(1, 1).x);
  });

  it("returns maxDistance when no wall is hit within it", () => {
    expect(castRay(at(1, 1), 0, 50, grid.isSolid)).toBe(50);
  });

  it("is blocked by a single interior wall tile", () => {
    expect(castRay(at(1, 2), 0, 500, grid.isSolid)).toBeCloseTo(4 * TILE_SIZE - at(1, 2).x);
  });

  it("works in every direction, including straight up and down", () => {
    expect(castRay(at(2, 2), -Math.PI / 2, 500, grid.isSolid)).toBeCloseTo(at(2, 2).y - TILE_SIZE);
    expect(castRay(at(2, 2), Math.PI / 2, 500, grid.isSolid)).toBeCloseTo(4 * TILE_SIZE - at(2, 2).y);
    expect(castRay(at(6, 1), Math.PI, 500, grid.isSolid)).toBeCloseTo(at(6, 1).x - TILE_SIZE);
  });

  it("returns 0 when starting inside a wall", () => {
    expect(castRay(at(4, 2), 0, 500, grid.isSolid)).toBe(0);
  });
});

describe("hasLineOfSight", () => {
  it("is clear across open floor and blocked by a wall in between", () => {
    expect(hasLineOfSight(at(1, 1), at(7, 1), grid.isSolid)).toBe(true);
    expect(hasLineOfSight(at(1, 2), at(7, 2), grid.isSolid)).toBe(false);
  });

  it("is symmetric", () => {
    expect(hasLineOfSight(at(7, 2), at(1, 2), grid.isSolid)).toBe(false);
    expect(hasLineOfSight(at(7, 3), at(1, 1), grid.isSolid)).toBe(hasLineOfSight(at(1, 1), at(7, 3), grid.isSolid));
  });
});

describe("canSee", () => {
  const eye = at(1, 1);

  it("sees a target ahead, in range, with a clear line", () => {
    expect(canSee(eye, 0, at(6, 1), VISION, grid.isSolid)).toBe(true);
  });

  it("does not see beyond the vision radius", () => {
    expect(canSee(eye, 0, at(7, 1), { ...VISION, radius: 80 }, grid.isSolid)).toBe(false);
  });

  it("does not see behind (outside the field of view)", () => {
    expect(canSee(eye, Math.PI, at(6, 1), VISION, grid.isSolid)).toBe(false);
  });

  it("respects the edge of the field of view (±45° for a 90° cone)", () => {
    const toward = (degrees: number) => ({ x: eye.x + 40 * Math.cos(degrees * DEG), y: eye.y + 40 * Math.sin(degrees * DEG) });
    expect(canSee(eye, 0, toward(40), VISION, grid.isSolid)).toBe(true);
    expect(canSee(eye, 0, toward(50), VISION, grid.isSolid)).toBe(false);
  });

  it("does not see through walls", () => {
    expect(canSee(at(2, 2), 0, at(6, 2), VISION, grid.isSolid)).toBe(false);
  });
});

describe("visionPolygon", () => {
  it("has rayCount + 1 points, each within the vision radius", () => {
    const points = visionPolygon(at(1, 2), 0, VISION, grid.isSolid, 16);
    expect(points).toHaveLength(17);
    for (const point of points) expect(distance(at(1, 2), point)).toBeLessThanOrEqual(VISION.radius + 1e-9);
  });

  it("is cut short where walls block the view", () => {
    const points = visionPolygon(at(1, 2), 0, VISION, grid.isSolid, 16);
    const middle = points[8]; // the ray straight ahead hits the wall at (4, 2)
    expect(middle.x).toBeCloseTo(4 * TILE_SIZE);
  });
});

describe("geometry helpers", () => {
  it("normalizeAngle wraps into (-π, π]", () => {
    expect(normalizeAngle(3 * Math.PI)).toBeCloseTo(Math.PI);
    expect(normalizeAngle(-Math.PI / 2 - 2 * Math.PI)).toBeCloseTo(-Math.PI / 2);
  });

  it("turnToward turns the short way and never overshoots", () => {
    expect(turnToward(0, Math.PI / 2, 0.1)).toBeCloseTo(0.1);
    expect(turnToward(170 * DEG, -170 * DEG, 5 * DEG)).toBeCloseTo(175 * DEG);
    expect(turnToward(0, 0.05, 0.1)).toBeCloseTo(0.05);
  });
});
