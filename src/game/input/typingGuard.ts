import Phaser from "phaser";

function isEditable(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || target.matches("input, textarea, select"));
}

/**
 * Phaser listens for keys on the whole window and calls preventDefault on captured keys (WASD,
 * arrows, Space, R), which would make those keys impossible to type into the UI's text fields.
 * While a text field has focus, the game's keyboard is switched off entirely: typing works, and
 * the player does not move. Held keys are released so none stay "stuck" down.
 */
export function suspendKeyboardWhileTyping(game: Phaser.Game): void {
  const setEnabled = (enabled: boolean) => {
    const keyboard = game.input?.keyboard;
    if (!keyboard) return;
    keyboard.enabled = enabled;
    if (!enabled) for (const scene of game.scene.getScenes(true)) scene.input.keyboard?.resetKeys();
  };
  const onFocusIn = (event: FocusEvent) => {
    if (isEditable(event.target)) setEnabled(false);
  };
  const onFocusOut = (event: FocusEvent) => {
    if (isEditable(event.target)) setEnabled(true);
  };
  document.addEventListener("focusin", onFocusIn);
  document.addEventListener("focusout", onFocusOut);
  game.events.once(Phaser.Core.Events.DESTROY, () => {
    document.removeEventListener("focusin", onFocusIn);
    document.removeEventListener("focusout", onFocusOut);
  });
}
