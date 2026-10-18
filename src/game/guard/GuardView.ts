import type Phaser from "phaser";
import { animateCharacter } from "../art/characters";
import { facingFromAngle } from "../art/facing";
import { DEPTH } from "../constants";
import type { DisplayOptions } from "../displayOptions";
import type { Vector } from "../geometry";
import { PALETTE } from "../palette";
import { stateIconTexture } from "../textures";
import type { GuardState } from "./guardDfa";

const CONE_COLOR: Record<GuardState, number> = {
  PATROL: PALETTE.visionCalm,
  ALERT: PALETTE.visionAlert,
  CHASE: PALETTE.visionChase,
  SEARCH: PALETTE.visionAlert,
  CAPTURE: PALETTE.visionChase,
};

/** What the guard looks like this frame (all read from the guard; nothing here changes it). */
export interface GuardLook {
  readonly state: GuardState;
  readonly eye: Vector;
  /** Vision outline from perception.visionPolygon (the same ray-cast that detection uses). */
  readonly visible: readonly Vector[];
  readonly facing: number;
  readonly moving: boolean;
  readonly selected: boolean;
}

/**
 * Rendering only: the guard's walking sprite, its vision cone, a ring when selected, and an icon
 * for its current DFA state that "pops" when the state changes.
 */
export class GuardView {
  private readonly cone: Phaser.GameObjects.Graphics;
  private readonly icon: Phaser.GameObjects.Image;
  /** Animated offsets for the icon (tweened; the icon follows the guard every frame). */
  private readonly motion = { y: 0, scale: 1 };
  private shownState: GuardState | null = null;
  private tweens: Phaser.Tweens.Tween[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly sprite: Phaser.GameObjects.Sprite,
    /** The guard's own color, used for the selection ring. */
    private readonly color: number,
    /** The guard's sprite sheet (see art/characters.ts). */
    private readonly sheet: string,
  ) {
    this.cone = scene.add.graphics().setDepth(DEPTH.vision);
    this.icon = scene.add.image(0, 0, stateIconTexture("PATROL")).setDepth(DEPTH.icons);
  }

  update(look: GuardLook, display: DisplayOptions): void {
    animateCharacter(this.sprite, this.sheet, facingFromAngle(look.facing), look.moving && look.state !== "CAPTURE");

    this.cone.clear();
    if (display.visionCones && look.state !== "CAPTURE" && look.visible.length > 0) {
      const color = CONE_COLOR[look.state];
      this.cone.fillStyle(color, 0.14);
      this.cone.lineStyle(1, color, 0.35);
      this.cone.beginPath();
      this.cone.moveTo(look.eye.x, look.eye.y);
      for (const point of look.visible) this.cone.lineTo(point.x, point.y);
      this.cone.closePath();
      this.cone.fillPath();
      this.cone.strokePath();
    }
    if (look.selected) {
      this.cone.lineStyle(1, this.color, 1);
      this.cone.strokeEllipse(this.sprite.x, this.sprite.y + 7, 16, 7);
    }

    if (look.state !== this.shownState) this.showState(look.state, display.effects);
    this.icon
      .setPosition(Math.round(this.sprite.x), Math.round(this.sprite.y - 14 + this.motion.y))
      .setScale(this.motion.scale);
  }

  /** Switches the icon, with a short pop and a per-state idle motion (unless effects are off). */
  private showState(state: GuardState, effects: boolean): void {
    this.shownState = state;
    for (const tween of this.tweens) tween.remove();
    this.tweens = [];
    this.motion.y = 0;
    this.motion.scale = 1;
    this.icon.setTexture(stateIconTexture(state)).setAlpha(state === "PATROL" ? 0.75 : 1);
    if (!effects) return;

    const tweens = this.scene.tweens;
    if (state !== "PATROL") {
      this.motion.scale = 1.8;
      this.tweens.push(tweens.add({ targets: this.motion, scale: 1, duration: 220, ease: "Back.easeOut" }));
    }
    if (state === "ALERT" || state === "SEARCH") {
      this.tweens.push(
        tweens.add({ targets: this.motion, y: -2, duration: state === "ALERT" ? 260 : 600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" }),
      );
    } else if (state === "CHASE") {
      this.tweens.push(tweens.add({ targets: this.icon, alpha: 0.55, duration: 200, yoyo: true, repeat: -1, delay: 220 }));
    }
  }
}
