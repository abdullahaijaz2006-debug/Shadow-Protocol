import type Phaser from "phaser";
import { TILE_SIZE } from "../constants";
import type { TILE } from "../level/tileLayer";
import { PALETTE } from "../palette";
import { px, type Draw } from "./draw";

const S = TILE_SIZE;

/** A riveted steel floor plate with a seam on its right and bottom edges. */
function plate(g: Phaser.GameObjects.Graphics, base: number): void {
  px(g, base, 0, 0, S, S);
  px(g, PALETTE.floorPlateLight, 0, 0, S - 1, 1); // lit top edge
  px(g, PALETTE.floorSeam, S - 1, 0, 1, S);
  px(g, PALETTE.floorSeam, 0, S - 1, S, 1);
  for (const [x, y] of [[2, 2], [S - 4, 2], [2, S - 4], [S - 4, S - 4]]) px(g, PALETTE.floorSpeck, x, y);
}

/** Drawing for each tile in the tileset, keyed like TILE. */
export const TILE_ART: Record<keyof typeof TILE, Draw> = {
  floor: (g) => {
    plate(g, PALETTE.floorPlate);
    px(g, PALETTE.floorSpeck, 9, 7);
  },

  // A worn plate: a faint scuff and a few slots, so the floor isn't a perfect grid.
  floorAlt: (g) => {
    plate(g, PALETTE.floorPlate);
    for (let y = 6; y < 11; y += 2) px(g, PALETTE.floorGrate, 6, y, 4, 1);
    px(g, PALETTE.floorPlateLight, 10, 11, 2, 1);
  },

  // Floor directly below a wall: the wall casts a soft shadow onto its top rows.
  floorShadow: (g) => {
    plate(g, PALETTE.floorPlate);
    g.fillStyle(PALETTE.floorShadow, 0.85);
    g.fillRect(0, 0, S, 3);
    g.fillStyle(PALETTE.floorShadow, 0.45);
    g.fillRect(0, 3, S, 2);
  },

  // Top of a wall, seen from above (used when another wall is below it).
  wallTop: (g) => {
    px(g, PALETTE.wallTop, 0, 0, S, S);
    px(g, PALETTE.wallTopHighlight, 0, 0, S, 1);
    px(g, PALETTE.wallTopHighlight, 0, 0, 1, S);
    px(g, PALETTE.wallMortar, S - 1, 0, 1, S);
    px(g, PALETTE.wallMortar, 0, S - 1, S, 1);
    // Inset panel
    px(g, PALETTE.wallPanel, 3, 3, S - 6, S - 6);
    px(g, PALETTE.wallTopHighlight, 3, S - 4, S - 6, 1);
  },

  // Wall with its front visible (floor below it), giving a 3/4 top-down look.
  wallFace: (g) => {
    // Cap
    px(g, PALETTE.wallTop, 0, 0, S, 4);
    px(g, PALETTE.wallTopHighlight, 0, 0, S, 1);
    // Steel panels
    px(g, PALETTE.wallFace, 0, 4, S, 12);
    px(g, PALETTE.wallMortar, 0, 4, S, 1);
    px(g, PALETTE.wallMortar, 7, 5, 1, 9);
    px(g, PALETTE.wallMortar, S - 1, 5, 1, 9);
    // A dim accent stripe and the baseboard
    px(g, PALETTE.wallAccent, 0, 9, S, 1);
    px(g, PALETTE.wallBase, 0, 14, S, 2);
  },
};
