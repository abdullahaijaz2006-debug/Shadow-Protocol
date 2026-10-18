import Phaser from "phaser";
import type { MovementInput } from "./movement";

const KeyCodes = Phaser.Input.Keyboard.KeyCodes;

/** Keys for each movement direction: WASD and the arrow keys. */
const BINDINGS: Record<keyof MovementInput, number[]> = {
  up: [KeyCodes.W, KeyCodes.UP],
  down: [KeyCodes.S, KeyCodes.DOWN],
  left: [KeyCodes.A, KeyCodes.LEFT],
  right: [KeyCodes.D, KeyCodes.RIGHT],
};

/**
 * Reads the movement keys each frame.
 *
 * - Keys are added with capture enabled, so Phaser calls preventDefault on them and the arrow
 *   keys never scroll the window.
 * - Phaser's KeyboardPlugin resets every key when the window loses focus (game BLUR) or the scene
 *   pauses/sleeps, so a key released while the app is unfocused never gets "stuck" down: `read()`
 *   simply reports nothing held, and the player stops.
 */
export class PlayerControls {
  private readonly keys: Record<keyof MovementInput, Phaser.Input.Keyboard.Key[]>;
  /** Space: make a noise (captured too, so it never scrolls the page). */
  private readonly noiseKey: Phaser.Input.Keyboard.Key;

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error("Keyboard input is disabled in the game config");

    const addKeys = (codes: number[]) => codes.map((code) => keyboard.addKey(code, true));
    this.keys = {
      up: addKeys(BINDINGS.up),
      down: addKeys(BINDINGS.down),
      left: addKeys(BINDINGS.left),
      right: addKeys(BINDINGS.right),
    };
    this.noiseKey = keyboard.addKey(KeyCodes.SPACE, true);
  }

  /** True on the single frame Space goes down (holding it does not repeat). */
  noisePressed(): boolean {
    return Phaser.Input.Keyboard.JustDown(this.noiseKey);
  }

  /** Which directions are held right now. */
  read(): MovementInput {
    const isHeld = (keys: Phaser.Input.Keyboard.Key[]) => keys.some((key) => key.isDown);
    return {
      up: isHeld(this.keys.up),
      down: isHeld(this.keys.down),
      left: isHeld(this.keys.left),
      right: isHeld(this.keys.right),
    };
  }
}
