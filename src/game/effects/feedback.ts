import type Phaser from "phaser";
import type { TransitionRecord } from "../../automata";
import { playSound } from "../audio/sfx";
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from "../constants";
import type { DisplayOptions } from "../displayOptions";
import type { GuardState } from "../guard/guardDfa";

/**
 * Sound and screen feedback for a DFA transition that has *already happened*. It only reads the
 * runner's transition record; it never feeds events or changes state, so it cannot affect the
 * automaton or the simulation.
 */
export function transitionFeedback(scene: Phaser.Scene, record: TransitionRecord, display: DisplayOptions): void {
  const from = record.from[0] as GuardState;
  const to = record.to[0] as GuardState;
  if (from === to) return; // self-loops: nothing changes visibly

  switch (to) {
    case "ALERT":
      playSound("spotted");
      break;
    case "CHASE":
      playSound("alarm");
      if (display.effects) scene.cameras.main.shake(160, 0.004);
      break;
    case "SEARCH":
      playSound("search");
      break;
    case "PATROL":
      playSound("clear");
      break;
    case "CAPTURE":
      playSound("capture");
      if (display.effects) {
        scene.cameras.main.shake(280, 0.006);
        captureFlash(scene);
      }
      break;
  }
}

/** A brief red tint over the game view (not a full-screen flash, so the game stays readable). */
function captureFlash(scene: Phaser.Scene): void {
  const overlay = scene.add
    .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH * 2, GAME_HEIGHT * 2, 0xff2d2d, 0)
    .setScrollFactor(0)
    .setDepth(DEPTH.overlay);
  scene.tweens.add({
    targets: overlay,
    fillAlpha: 0.22,
    duration: 120,
    yoyo: true,
    hold: 120,
    onComplete: () => overlay.destroy(),
  });
}
