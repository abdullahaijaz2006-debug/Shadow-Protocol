// Purely visual options set from the UI's Settings. Pure TypeScript.

export interface DisplayOptions {
  /** Draw the guards' vision cones (detection works the same either way). */
  readonly visionCones: boolean;
  /** Camera shake, flashes and icon animations. */
  readonly effects: boolean;
}

export const DEFAULT_DISPLAY_OPTIONS: DisplayOptions = { visionCones: true, effects: true };

/** Phaser registry key, so the options survive a level restart. */
export const DISPLAY_REGISTRY_KEY = "displayOptions";
