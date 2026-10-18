// Pure TypeScript: no Phaser imports, so this can be unit-tested in Node.

export type Tile = "floor" | "wall";

export interface GridPoint {
  col: number;
  row: number;
}

export interface Level {
  width: number;
  height: number;
  /** tiles[row][col] */
  tiles: Tile[][];
  playerSpawn: GridPoint;
}

/**
 * Legend:
 *   #  wall
 *   .  floor
 *   P  player spawn (floor underneath)
 */
const TILE_CHARS: Record<string, Tile> = {
  "#": "wall",
  ".": "floor",
  P: "floor",
};

/** Converts an ASCII map into a Level. Throws on malformed input. */
export function parseLevel(rows: readonly string[]): Level {
  if (rows.length === 0) {
    throw new Error("Level has no rows");
  }

  const width = rows[0].length;
  const tiles: Tile[][] = [];
  let playerSpawn: GridPoint | null = null;

  for (let row = 0; row < rows.length; row++) {
    const line = rows[row];
    if (line.length !== width) {
      throw new Error(`Row ${row} has length ${line.length}, expected ${width}`);
    }

    const tileRow: Tile[] = [];
    for (let col = 0; col < width; col++) {
      const ch = line[col];
      const tile = TILE_CHARS[ch];
      if (!tile) {
        throw new Error(`Unknown tile '${ch}' at row ${row}, col ${col}`);
      }
      if (ch === "P") {
        if (playerSpawn) {
          throw new Error("Level has more than one player spawn");
        }
        playerSpawn = { col, row };
      }
      tileRow.push(tile);
    }
    tiles.push(tileRow);
  }

  if (!playerSpawn) {
    throw new Error("Level has no player spawn ('P')");
  }

  return { width, height: rows.length, tiles, playerSpawn };
}
