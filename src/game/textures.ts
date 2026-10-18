import Phaser from "phaser";
import { generateCharacterSheet, guardLook, PLAYER_LOOK } from "./art/characters";
import { DECOR_ART, drawLed } from "./art/decorArt";
import { makeTexture } from "./art/draw";
import { STATE_ICONS } from "./art/icons";
import { TILE_ART } from "./art/tiles";
import { TILE_SIZE } from "./constants";
import { GUARD_STATES, type GuardState } from "./guard/guardDfa";
import type { DecorKind } from "./level/decor";
import { TILE } from "./level/tileLayer";

/**
 * All art is drawn in code (no image files to download or license). This module only names the
 * textures and creates them; the drawings live in art/.
 */
export const TEXTURES = {
  /** All map tiles side by side, in the order given by TILE (level/tileLayer.ts). */
  tileset: "tileset",
  /** The player's sprite sheet (4 facings × 3 frames; see art/characters.ts). */
  player: "player",
  /** The blinking light on security cameras. */
  led: "led",
} as const;

/** Texture key of a guard state icon. */
export function stateIconTexture(state: GuardState): string {
  return `icon-${state.toLowerCase()}`;
}

/** Texture key of a decoration. */
export function decorTexture(kind: DecorKind): string {
  return `decor-${kind}`;
}

/** Creates (once) a guard's sprite sheet in its uniform color with its number, and returns its key. */
export function generateGuardTexture(scene: Phaser.Scene, id: string, uniform: number, label: string): string {
  return generateCharacterSheet(scene, `guard-${id}`, guardLook(uniform, label));
}

export function generateTextures(scene: Phaser.Scene): void {
  const tiles = Object.entries(TILE) as [keyof typeof TILE, number][];
  makeTexture(
    scene,
    TEXTURES.tileset,
    tiles.length * TILE_SIZE,
    tiles.map(([name, index]) => [index * TILE_SIZE, TILE_ART[name]]),
  );
  generateCharacterSheet(scene, TEXTURES.player, PLAYER_LOOK);
  for (const state of GUARD_STATES) {
    makeTexture(scene, stateIconTexture(state), STATE_ICONS[state].width, [[0, STATE_ICONS[state].draw]]);
  }
  for (const [kind, draw] of Object.entries(DECOR_ART) as [DecorKind, (typeof DECOR_ART)[DecorKind]][]) {
    makeTexture(scene, decorTexture(kind), TILE_SIZE, [[0, draw]]);
  }
  makeTexture(scene, TEXTURES.led, 2, [[0, drawLed]], 2);
}
