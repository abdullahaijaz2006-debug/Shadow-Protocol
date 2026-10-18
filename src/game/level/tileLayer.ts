// Pure TypeScript: no Phaser imports, so this can be unit-tested in Node.
import type { Level } from "./parseLevel";

/** Tile indices in the generated tileset texture (see art/tiles.ts), left to right. */
export const TILE = {
  floor: 0,
  floorAlt: 1,
  wallTop: 2,
  wallFace: 3,
  /** Floor directly below a wall: drawn with a soft shadow cast by the wall. Still walkable. */
  floorShadow: 4,
} as const;

export type TileIndex = (typeof TILE)[keyof typeof TILE];

/** Tiles the player collides with. */
export const SOLID_TILES: readonly TileIndex[] = [TILE.wallTop, TILE.wallFace];

/** Converts a parsed level into tileset indices for a Phaser tilemap: result[row][col]. */
export function buildTileIndices(level: Level): TileIndex[][] {
  return level.tiles.map((tiles, row) => tiles.map((_tile, col) => tileIndexAt(level, col, row)));
}

function tileIndexAt(level: Level, col: number, row: number): TileIndex {
  if (level.tiles[row][col] === "floor") {
    // A wall directly above casts a shadow onto this floor tile.
    if (level.tiles[row - 1]?.[col] === "wall") return TILE.floorShadow;
    // Deterministic variation so the floor doesn't look like a flat grid.
    return (col * 7 + row * 13) % 5 === 0 ? TILE.floorAlt : TILE.floor;
  }
  // A wall with floor directly below shows its face (3/4 top-down look).
  const below = level.tiles[row + 1]?.[col];
  return below === "floor" ? TILE.wallFace : TILE.wallTop;
}
