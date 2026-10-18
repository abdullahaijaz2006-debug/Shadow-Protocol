import { TILE_SIZE } from "../constants";
import type { DecorKind } from "../level/decor";
import { PALETTE } from "../palette";
import { px, type Draw } from "./draw";

const S = TILE_SIZE;

/** 16×16 decoration images, drawn over their tile. */
export const DECOR_ART: Record<DecorKind, Draw> = {
  // A wooden crate seen from above, with its front edge visible.
  crate: (g) => {
    px(g, PALETTE.crateDark, 0, 0, S, S);
    px(g, PALETTE.crate, 1, 1, S - 2, S - 4);
    px(g, PALETTE.crateLight, 1, 1, S - 2, 1);
    px(g, PALETTE.crateDark, 1, 6, S - 2, 1); // plank
    px(g, PALETTE.crateDark, 7, 1, 1, S - 4);
    px(g, PALETTE.crateDark, 0, S - 3, S, 3); // front edge
    px(g, PALETTE.crate, 2, S - 2, S - 4, 1);
  },

  // A wall-mounted terminal: a dark screen with lines of text and a status light.
  terminal: (g) => {
    px(g, PALETTE.metalDark, 2, 5, 12, 9);
    px(g, PALETTE.screen, 3, 6, 10, 6);
    px(g, PALETTE.screenText, 4, 7, 6, 1);
    px(g, PALETTE.screenText, 4, 9, 4, 1);
    px(g, PALETTE.screenText, 4, 11, 7, 1);
    px(g, PALETTE.ledGreen, 12, 13);
  },

  // A server rack with rows of lights.
  rack: (g) => {
    px(g, PALETTE.metalDark, 3, 4, 10, 11);
    for (let y = 5; y < 14; y += 3) {
      px(g, PALETTE.metal, 4, y, 8, 2);
      px(g, PALETTE.ledGreen, 10, y);
      px(g, y === 8 ? PALETTE.ledRed : PALETTE.ledGreen, 11, y + 1);
    }
  },

  // A security camera on a bracket, pointing down into the room (its red light blinks).
  camera: (g) => {
    px(g, PALETTE.metalDark, 7, 4, 2, 3); // bracket
    px(g, PALETTE.metal, 5, 7, 7, 4);
    px(g, PALETTE.metalDark, 5, 10, 7, 1);
    px(g, PALETTE.guardOutline, 9, 11, 3, 2); // lens
  },

  // A floor vent grille.
  // A floor vent grille: metal slats (lighter than the floor, so it never reads as a hole).
  vent: (g) => {
    px(g, PALETTE.metalDark, 3, 3, 10, 10);
    for (let x = 4; x < 13; x += 2) px(g, PALETTE.wallPanel, x, 4, 1, 8);
    px(g, PALETTE.metal, 3, 3, 10, 1);
  },

  // Yellow-and-black warning stripes at a doorway.
  // Thin stripes along the doorway's edges only, so the opening still reads as open floor.
  hazard: (g) => {
    g.fillStyle(PALETTE.hazardYellow, 0.45);
    for (let x = 0; x < S; x += 4) {
      g.fillRect(x, 0, 2, 2);
      g.fillRect(x + 2, S - 2, 2, 2);
    }
  },
};

/** The camera's blinking light (2×2), animated separately. */
export const drawLed: Draw = (g) => px(g, PALETTE.ledRed, 0, 0, 2, 2);
