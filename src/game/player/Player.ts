import Phaser from "phaser";
import { animateCharacter, characterFrame } from "../art/characters";
import { facingFromVelocity, type Facing } from "../art/facing";
import { DEPTH, PLAYER_HITBOX, PLAYER_SPEED } from "../constants";
import type { Vector } from "../geometry";
import { TEXTURES } from "../textures";
import { movementVelocity } from "./movement";
import { PlayerControls } from "./PlayerControls";

/** The player character: an Arcade Physics sprite moved by the keyboard. */
export class Player {
  readonly sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private readonly controls: PlayerControls;
  private frozen = false;
  /** Visual only: which way the sprite faces (kept while standing still). */
  private facing: Facing = "down";

  /** Creates the player centered on (x, y). */
  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Always a 16×16 frame (never the whole sheet), so the hitbox offset below is unchanged.
    this.sprite = scene.physics.add.sprite(x, y, TEXTURES.player, characterFrame("down")).setDepth(DEPTH.actors);
    this.sprite.body
      .setSize(PLAYER_HITBOX.width, PLAYER_HITBOX.height, false)
      .setOffset(PLAYER_HITBOX.offsetX, PLAYER_HITBOX.offsetY);
    // Apply the new hitbox now, not at the first physics step (matters when a level starts paused).
    this.sprite.body.updateFromGameObject();
    // Stay inside the physics world bounds (the map), even if a wall were ever missing.
    this.sprite.setCollideWorldBounds(true);
    this.controls = new PlayerControls(scene);
  }

  /** Center of the sprite (what guards look at). */
  get center(): Vector {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  /** Center of the feet hitbox (used for navigation, noise and catching). */
  get feet(): Vector {
    return { x: this.sprite.body.center.x, y: this.sprite.body.center.y };
  }

  /** A frozen player ignores input (used once captured). */
  setFrozen(frozen: boolean): void {
    this.frozen = frozen;
    if (frozen) this.sprite.setVelocity(0, 0);
  }

  /** True on the frame the player makes a noise (Space). */
  noisePressed(): boolean {
    return this.controls.noisePressed() && !this.frozen;
  }

  /**
   * Visual only, every frame: faces the direction of travel and plays the walk cycle while moving.
   * Uses the body's velocity after collisions, so walking into a wall shows the standing frame.
   */
  render(): void {
    const { x, y } = this.sprite.body.velocity;
    this.facing = facingFromVelocity(x, y, this.facing);
    animateCharacter(this.sprite, TEXTURES.player, this.facing, !this.frozen && (x !== 0 || y !== 0));
  }

  /** Call once per simulation tick. Velocity (not position) is set, so physics resolves wall collisions. */
  update(): void {
    if (this.frozen) return;
    const velocity = movementVelocity(this.controls.read(), PLAYER_SPEED);
    this.sprite.setVelocity(velocity.x, velocity.y);
  }
}
