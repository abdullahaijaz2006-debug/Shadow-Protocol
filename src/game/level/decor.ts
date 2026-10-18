// Purely visual decorations for a level. Pure TypeScript.
//
// Decorations never change collision: solid-looking objects (crates, terminals, racks, cameras)
// may only be placed on wall tiles, and only flat decals (vents, hazard stripes) on floor tiles,
// so nothing that looks like an obstacle ever stands on walkable floor.
import type { Level } from "./parseLevel";

export type DecorKind = "crate" | "terminal" | "rack" | "camera" | "vent" | "hazard";

export interface Decor {
  readonly kind: DecorKind;
  readonly col: number;
  readonly row: number;
}

/** Where each kind may go: any wall tile, a wall tile with floor directly below (its visible face), or floor. */
export const DECOR_PLACEMENT: Readonly<Record<DecorKind, "wall" | "wallFace" | "floor">> = {
  crate: "wall",
  terminal: "wallFace",
  rack: "wallFace",
  camera: "wallFace",
  vent: "floor",
  hazard: "floor",
};

const each = (kind: DecorKind, cells: readonly [number, number][]): Decor[] => cells.map(([col, row]) => ({ kind, col, row }));

/** Decorations for LEVEL_01. */
export const LEVEL_01_DECOR: readonly Decor[] = [
  // The two 4×2 wall blocks in the middle room are drawn as stacks of crates.
  ...each("crate", [6, 7, 8, 9, 30, 31, 32, 33].flatMap((col) => [[col, 12], [col, 13]] as [number, number][])),
  // Terminals and a server rack in the two small top rooms.
  ...each("terminal", [[5, 3], [6, 3], [29, 3]]),
  ...each("rack", [[30, 3], [16, 16], [17, 16], [22, 16], [23, 16]]),
  // Security cameras on the outer and middle walls.
  ...each("camera", [[9, 0], [30, 0], [19, 5]]),
  // Floor decals.
  ...each("vent", [[12, 15], [27, 11], [3, 18], [36, 5]]),
  ...each("hazard", [[10, 9], [17, 9], [18, 9], [19, 9], [20, 9], [28, 9], [19, 19]]),
];

/** Every way a decoration list breaks the placement rules (empty when valid). */
export function validateDecor(level: Level, decor: readonly Decor[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const d of decor) {
    const at = `${d.kind} at (${d.col}, ${d.row})`;
    const tile = level.tiles[d.row]?.[d.col];
    if (tile === undefined) {
      problems.push(`${at} is outside the level`);
      continue;
    }
    const key = `${d.col},${d.row}`;
    if (seen.has(key)) problems.push(`${at} overlaps another decoration`);
    seen.add(key);
    const placement = DECOR_PLACEMENT[d.kind];
    if (placement === "floor" && tile !== "floor") problems.push(`${at} must be on floor`);
    if (placement !== "floor" && tile !== "wall") problems.push(`${at} must be on a wall (it would look like an obstacle)`);
    if (placement === "wallFace" && level.tiles[d.row + 1]?.[d.col] !== "floor") problems.push(`${at} must be on a wall face (floor below)`);
  }
  return problems;
}
