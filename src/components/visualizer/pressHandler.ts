import type { MouseEvent } from "react";
import { playSound } from "../../game/audio/sfx";

/**
 * Click handler for UI buttons next to the game: plays a soft click, runs `action`, then gives
 * keyboard focus back to the page, so a later Space or Enter goes to the game instead of
 * re-clicking the button.
 */
export function pressHandler(action: () => void) {
  return (event: MouseEvent<HTMLButtonElement>) => {
    playSound("click");
    action();
    event.currentTarget.blur();
  };
}
