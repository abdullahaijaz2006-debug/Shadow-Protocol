import { describe, expect, it } from "vitest";
import { LEVEL_01 } from "./levels";
import { parseLevel } from "./parseLevel";
import { buildTileIndices, SOLID_TILES, TILE } from "./tileLayer";

describe("buildTileIndices", () => {
  it("uses the wall face when floor is directly below, and the wall top otherwise", () => {
    const indices = buildTileIndices(parseLevel(["###", "#P#", "###"]));
    expect(indices[0]).toEqual([TILE.wallTop, TILE.wallFace, TILE.wallTop]);
    expect(indices[2]).toEqual([TILE.wallTop, TILE.wallTop, TILE.wallTop]);
    // Floor with a wall directly above gets the wall's shadow.
    expect(indices[1][1]).toBe(TILE.floorShadow);
  });

  it("uses the plain floor variants where no wall is directly above", () => {
    const indices = buildTileIndices(parseLevel(["####", "#P.#", "#..#", "####"]));
    expect([TILE.floor, TILE.floorAlt]).toContain(indices[2][1]);
    expect([TILE.floor, TILE.floorAlt]).toContain(indices[2][2]);
  });

  describe("LEVEL_01", () => {
    const level = parseLevel(LEVEL_01);
    const indices = buildTileIndices(level);

    it("has one index per tile", () => {
      expect(indices).toHaveLength(level.height);
      expect(indices.every((row) => row.length === level.width)).toBe(true);
    });

    it("makes every wall solid and every floor walkable", () => {
      level.tiles.forEach((tiles, row) =>
        tiles.forEach((tile, col) => {
          expect(SOLID_TILES.includes(indices[row][col]), `(${col}, ${row})`).toBe(tile === "wall");
        }),
      );
    });

    it("spawns the player on a walkable tile", () => {
      const { col, row } = level.playerSpawn;
      expect(SOLID_TILES).not.toContain(indices[row][col]);
    });
  });
});
