import { describe, expect, it } from "vitest";
import { GAME_HEIGHT, GAME_WIDTH, TILE_SIZE } from "../constants";
import { LEVEL_01 } from "./levels";
import { parseLevel } from "./parseLevel";

describe("parseLevel", () => {
  it("parses walls, floor and the player spawn", () => {
    const level = parseLevel(["###", "#P#", "###"]);
    expect(level.width).toBe(3);
    expect(level.height).toBe(3);
    expect(level.tiles[0][0]).toBe("wall");
    expect(level.tiles[1][1]).toBe("floor");
    expect(level.playerSpawn).toEqual({ col: 1, row: 1 });
  });

  it("rejects rows of different lengths", () => {
    expect(() => parseLevel(["###", "#P", "###"])).toThrow(/Row 1/);
  });

  it("rejects unknown characters", () => {
    expect(() => parseLevel(["#P?"])).toThrow(/Unknown tile/);
  });

  it("requires exactly one player spawn", () => {
    expect(() => parseLevel(["#.#"])).toThrow(/no player spawn/);
    expect(() => parseLevel(["PP"])).toThrow(/more than one/);
  });
});

describe("LEVEL_01", () => {
  const level = parseLevel(LEVEL_01);

  it("fits inside the internal resolution", () => {
    expect(level.width * TILE_SIZE).toBe(GAME_WIDTH);
    expect(level.height * TILE_SIZE).toBeLessThanOrEqual(GAME_HEIGHT);
  });

  it("is fully enclosed by walls", () => {
    const last = level.height - 1;
    for (let col = 0; col < level.width; col++) {
      expect(level.tiles[0][col]).toBe("wall");
      expect(level.tiles[last][col]).toBe("wall");
    }
    for (let row = 0; row < level.height; row++) {
      expect(level.tiles[row][0]).toBe("wall");
      expect(level.tiles[row][level.width - 1]).toBe("wall");
    }
  });
});
