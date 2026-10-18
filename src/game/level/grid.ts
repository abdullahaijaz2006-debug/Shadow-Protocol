// Pure TypeScript: no Phaser imports, so this can be unit-tested in Node.
import { TILE_SIZE } from "../constants";
import type { Vector } from "../geometry";
import type { GridPoint, Level } from "./parseLevel";

/** Tile-grid queries on a level, shared by perception, pathfinding and movement. */
export class LevelGrid {
  constructor(readonly level: Level) {}

  /** Floor tiles are walkable; walls and anything outside the map are not. */
  readonly isWalkable = (col: number, row: number): boolean => this.level.tiles[row]?.[col] === "floor";

  /** Walls, and everything outside the map, block movement and sight. */
  readonly isSolid = (col: number, row: number): boolean => !this.isWalkable(col, row);

  worldToTile(point: Vector): GridPoint {
    return { col: Math.floor(point.x / TILE_SIZE), row: Math.floor(point.y / TILE_SIZE) };
  }

  tileCenter({ col, row }: GridPoint): Vector {
    return { x: col * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 };
  }
}
