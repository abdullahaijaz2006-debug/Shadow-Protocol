import type Phaser from "phaser";
import { TILE_SIZE } from "../constants";

/** Draws one image into a Graphics object, in local coordinates starting at (0, 0). */
export type Draw = (g: Phaser.GameObjects.Graphics) => void;

/** Fills a w×h block of pixels. */
export function px(g: Phaser.GameObjects.Graphics, color: number, x: number, y: number, w = 1, h = 1): void {
  g.fillStyle(color);
  g.fillRect(x, y, w, h);
}

/** A color with each channel multiplied by `factor` (< 1 darkens). */
export function shade(color: number, factor: number): number {
  const channel = (shift: number) => Math.min(255, Math.round(((color >> shift) & 0xff) * factor));
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

/**
 * Draws `parts` (each at an x offset) into one Graphics and saves it as a texture of the given
 * size. Does nothing if the texture already exists (textures are shared across scene restarts).
 */
export function makeTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  parts: readonly [x: number, draw: Draw][],
  height = TILE_SIZE,
): boolean {
  if (scene.textures.exists(key)) return false;
  const g = scene.make.graphics({}, false);
  for (const [x, draw] of parts) {
    g.save();
    g.translateCanvas(x, 0);
    draw(g);
    g.restore();
  }
  g.generateTexture(key, width, height);
  g.destroy();
  return true;
}
