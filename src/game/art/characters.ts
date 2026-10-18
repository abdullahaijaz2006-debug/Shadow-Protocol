import type Phaser from "phaser";
import { TILE_SIZE } from "../constants";
import { PALETTE } from "../palette";
import { makeTexture, px, shade, type Draw } from "./draw";
import { FACINGS, type Facing } from "./facing";

/** Colors (and, for guards, a uniform number) for one character. */
export interface CharacterLook {
  readonly kind: "player" | "guard";
  readonly body: number;
  readonly head: number;
  /** Guards: the cap. Player: the back of the helmet. */
  readonly hat: number;
  /** Visor (player) or chest number (guards). */
  readonly light: number;
  /** Digit printed on a guard's uniform. */
  readonly label?: string;
}

/** Frames per facing: 0 = standing, 1 and 2 = the two walking steps. */
const PHASES = [0, 1, 2] as const;
type Phase = (typeof PHASES)[number];

export const PLAYER_LOOK: CharacterLook = {
  kind: "player",
  body: PALETTE.playerBody,
  head: PALETTE.playerHead,
  hat: PALETTE.playerHeadDark,
  light: PALETTE.playerVisor,
};

export function guardLook(uniform: number, label: string): CharacterLook {
  return { kind: "guard", body: uniform, head: PALETTE.guardHead, hat: PALETTE.guardCap, light: PALETTE.guardVisor, label };
}

/** Name of one frame in a character sheet, e.g. "left-1". */
export function characterFrame(facing: Facing, phase: Phase = 0): string {
  return `${facing}-${phase}`;
}

/** Key of a character's walking animation in one direction. */
export function walkAnimationKey(sheet: string, facing: Facing): string {
  return `${sheet}-walk-${facing}`;
}

/** 3×5 pixel digits printed on guard uniforms. */
const DIGITS: Record<string, readonly string[]> = {
  "1": [".#.", "##.", ".#.", ".#.", "###"],
  "2": ["##.", "..#", ".#.", "#..", "###"],
  "3": ["##.", "..#", ".#.", "..#", "##."],
  "4": ["#.#", "#.#", "###", "..#", "..#"],
};

const OUTLINE = PALETTE.guardOutline;

/** One 16×16 frame. The feet stay in the bottom rows, where the physics hitbox is. */
function drawCharacter(look: CharacterLook, facing: Facing, phase: Phase): Draw {
  const side = facing === "left" || facing === "right";
  const dark = shade(look.body, 0.62);
  return (g) => {
    // Shadow
    g.fillStyle(PALETTE.shadow, 0.35);
    g.fillEllipse(8, 14.5, 10, 3);

    // Legs: alternate steps. Side view: one leg forward, one back.
    if (side) {
      const stride = phase === 1 ? 1 : phase === 2 ? -1 : 0;
      px(g, OUTLINE, 6 + stride, 12, 2, 3);
      px(g, PALETTE.pants, 8 - stride, 12, 2, 3);
    } else {
      px(g, PALETTE.pants, 5, 12, 2, phase === 1 ? 2 : 3);
      px(g, PALETTE.pants, 9, 12, 2, phase === 2 ? 2 : 3);
    }

    // Torso
    px(g, OUTLINE, 4, 6, 8, 7);
    px(g, look.body, 5, 7, 6, 5);
    px(g, dark, 5, 11, 6, 1); // belt / hem

    // Arms swing opposite to the legs.
    if (side) {
      const swing = phase === 1 ? -1 : phase === 2 ? 1 : 0;
      px(g, dark, 7 + swing, 8, 2, 3);
    } else {
      px(g, dark, 3, phase === 1 ? 8 : 7, 1, 4);
      px(g, dark, 12, phase === 2 ? 8 : 7, 1, 4);
    }

    // Chest: guards wear their number front and back; the player has a small badge.
    if (look.kind === "guard" && look.label && !side) {
      (DIGITS[look.label] ?? []).forEach((row, y) =>
        [...row].forEach((cell, x) => cell === "#" && px(g, look.light, 6 + x, 7 + y)),
      );
    } else if (look.kind === "player" && facing === "down") {
      px(g, look.light, 7, 8, 2, 1);
    }

    // Head
    px(g, OUTLINE, 4, 1, 8, 7);
    px(g, look.head, 5, 2, 6, 5);

    if (look.kind === "player") {
      // A helmet with a visor that shows which way the player is looking.
      if (facing === "up") px(g, look.hat, 5, 2, 6, 5);
      else if (facing === "down") px(g, look.light, 6, 4, 4, 1);
      else if (facing === "right") px(g, look.light, 8, 4, 3, 1);
      else px(g, look.light, 5, 4, 3, 1);
      px(g, look.hat, 5, 2, 6, 1); // helmet ridge
    } else {
      // A cap with a brim pointing the way the guard is facing, and eyes.
      px(g, look.hat, 4, 1, 8, 2);
      if (facing === "up") {
        px(g, look.hat, 5, 3, 6, 3); // back of the head
      } else if (facing === "down") {
        px(g, look.hat, 3, 3, 10, 1);
        px(g, OUTLINE, 6, 4);
        px(g, OUTLINE, 9, 4);
      } else if (facing === "right") {
        px(g, look.hat, 7, 3, 6, 1);
        px(g, OUTLINE, 9, 4);
      } else {
        px(g, look.hat, 3, 3, 6, 1);
        px(g, OUTLINE, 6, 4);
      }
    }
  };
}

/**
 * Creates (once) a character sprite sheet: 4 facings × 3 frames, named like "down-0", plus a
 * looping walk animation per facing. Returns the sheet's texture key.
 */
export function generateCharacterSheet(scene: Phaser.Scene, key: string, look: CharacterLook): string {
  const frames = FACINGS.flatMap((facing) => PHASES.map((phase) => ({ facing, phase })));
  const created = makeTexture(
    scene,
    key,
    frames.length * TILE_SIZE,
    frames.map(({ facing, phase }, index) => [index * TILE_SIZE, drawCharacter(look, facing, phase)]),
  );
  if (created) {
    const texture = scene.textures.get(key);
    frames.forEach(({ facing, phase }, index) => texture.add(characterFrame(facing, phase), 0, index * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE));
  }
  for (const facing of FACINGS) {
    const anim = walkAnimationKey(key, facing);
    if (scene.anims.exists(anim)) continue;
    scene.anims.create({
      key: anim,
      frames: [1, 0, 2, 0].map((phase) => ({ key, frame: characterFrame(facing, phase as Phase) })),
      frameRate: 8,
      repeat: -1,
    });
  }
  return key;
}

/** Shows the walk animation while moving, or the standing frame, for the given facing. */
export function animateCharacter(sprite: Phaser.GameObjects.Sprite, sheet: string, facing: Facing, moving: boolean): void {
  if (moving) {
    sprite.anims.play(walkAnimationKey(sheet, facing), true);
    return;
  }
  if (sprite.anims.isPlaying) sprite.anims.stop();
  const frame = characterFrame(facing, 0);
  if (sprite.frame.name !== frame) sprite.setFrame(frame);
}
