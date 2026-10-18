import Phaser from "phaser";
import { BRIDGE_REGISTRY_KEY, type GameBridge } from "./bridge";
import { GAME_HEIGHT, GAME_WIDTH, PHYSICS_DEBUG } from "./constants";
import { suspendKeyboardWhileTyping } from "./input/typingGuard";
import { PALETTE } from "./palette";
import { MainScene } from "./scenes/MainScene";

/**
 * Creates the Phaser game inside `parent`, talking to the UI only through `bridge`.
 * The caller owns the game and must call `destroy(true)`.
 */
export function createGame(parent: HTMLElement, bridge: GameBridge): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: PALETTE.background,
    // Nearest-neighbour scaling keeps pixels crisp when the 640×360 canvas is enlarged.
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    // Top-down game: Arcade Physics with no gravity. `customUpdate` stops Phaser stepping the
    // world every frame; MainScene steps it once per simulation tick so pausing freezes physics too.
    physics: {
      default: "arcade",
      arcade: { gravity: { x: 0, y: 0 }, debug: PHYSICS_DEBUG, customUpdate: true },
    },
    // Set before any scene is created, so MainScene.create can always find it.
    callbacks: { preBoot: (game) => game.registry.set(BRIDGE_REGISTRY_KEY, bridge) },
    scene: [MainScene],
  });
  // Let the UI's text fields (e.g. in the Automata Lab) receive every key.
  suspendKeyboardWhileTyping(game);
  return game;
}
