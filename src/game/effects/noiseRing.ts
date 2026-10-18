import type Phaser from "phaser";
import { DEPTH } from "../constants";
import type { Vector } from "../geometry";
import { PALETTE } from "../palette";

/** Shows an expanding ring at `at` whose final size is the noise's hearing radius. */
export function showNoiseRing(scene: Phaser.Scene, at: Vector, radius: number): void {
  const ring = scene.add.graphics({ x: at.x, y: at.y }).setDepth(DEPTH.effects);
  ring.lineStyle(1, PALETTE.noise, 1);
  ring.strokeCircle(0, 0, radius);
  ring.setScale(0.1);
  scene.tweens.add({
    targets: ring,
    scale: 1,
    alpha: 0,
    duration: 600,
    ease: "Quad.easeOut",
    onComplete: () => ring.destroy(),
  });
}
