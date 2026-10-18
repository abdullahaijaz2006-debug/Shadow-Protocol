import { describe, expect, it } from "vitest";
import { DECOR_PLACEMENT, LEVEL_01_DECOR, validateDecor } from "./decor";
import { LevelGrid } from "./grid";
import { LEVEL_01 } from "./levels";
import { parseLevel } from "./parseLevel";

describe("LEVEL_01_DECOR", () => {
  const level = parseLevel(LEVEL_01);
  const grid = new LevelGrid(level);

  it("follows the placement rules", () => {
    expect(validateDecor(level, LEVEL_01_DECOR)).toEqual([]);
  });

  it("never puts anything that looks solid on walkable floor (collision is unchanged)", () => {
    for (const d of LEVEL_01_DECOR) {
      expect(grid.isWalkable(d.col, d.row), `${d.kind} at ${d.col},${d.row}`).toBe(DECOR_PLACEMENT[d.kind] === "floor");
    }
  });

  it("includes terminals, crates and security equipment", () => {
    const kinds = new Set(LEVEL_01_DECOR.map((d) => d.kind));
    for (const kind of ["crate", "terminal", "camera", "rack"] as const) expect(kinds.has(kind), kind).toBe(true);
  });
});

describe("validateDecor", () => {
  const level = parseLevel(["#####", "#P..#", "#####"]);

  it("rejects solid-looking decorations on floor, decals on walls, and overlaps", () => {
    expect(validateDecor(level, [{ kind: "crate", col: 2, row: 1 }])).toEqual([expect.stringMatching(/must be on a wall/)]);
    expect(validateDecor(level, [{ kind: "vent", col: 0, row: 0 }])).toEqual([expect.stringMatching(/must be on floor/)]);
    expect(validateDecor(level, [{ kind: "terminal", col: 1, row: 2 }])).toEqual([expect.stringMatching(/wall face/)]);
    expect(
      validateDecor(level, [
        { kind: "vent", col: 2, row: 1 },
        { kind: "hazard", col: 2, row: 1 },
      ]),
    ).toEqual([expect.stringMatching(/overlaps/)]);
    expect(validateDecor(level, [{ kind: "camera", col: 9, row: 9 }])).toEqual([expect.stringMatching(/outside/)]);
  });

  it("accepts a camera on a wall face", () => {
    expect(validateDecor(level, [{ kind: "camera", col: 2, row: 0 }])).toEqual([]);
  });
});
