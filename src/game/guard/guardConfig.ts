// All guard tuning values in one place. Pure TypeScript.
import type { GridPoint } from "../level/parseLevel";
import type { GuardState } from "./guardDfa";

/** Tuning shared by every guard. */
export const GUARD_CONFIG = {
  /** Movement speed per DFA state, in pixels per second (the player moves at 80). */
  speeds: { PATROL: 40, ALERT: 0, CHASE: 70, SEARCH: 50, CAPTURE: 0 } as Readonly<Record<GuardState, number>>,

  /** Vision: how far (pixels) and how wide (degrees) a guard can see. */
  visionRadius: 96,
  fovDegrees: 90,
  /** How fast a guard turns, in degrees per second. */
  turnRateDegrees: 270,

  /** Sight must be lost for this long before PLAYER_LOST is emitted. */
  lostDelayMs: 1500,
  /** A guard hears noises made within this distance (pixels), through walls. */
  hearingRadius: 128,

  /** ALERT: reaction time before the chase starts (then TIMER_EXPIRED). */
  alertReactionMs: 700,
  /** SEARCH: how long to look around at the last known position (then TIMER_EXPIRED). */
  searchLookAroundMs: 4000,

  /** CHASE: the player is caught when a guard's feet are this close (pixels). */
  catchDistance: 10,
  /** CHASE: how often to recompute the path to the player's last known position. */
  chaseRepathMs: 250,
} as const;

/** What makes one guard different from another. Everything mutable lives in the Guard instance. */
export interface GuardDefinition {
  /** Unique, stable identifier (used for selection and in snapshots). */
  readonly id: string;
  readonly name: string;
  /** Uniform color (0xRRGGBB); also used for this guard in the UI. */
  readonly color: number;
  /** Digit printed on the uniform, so guards can be told apart even without color. */
  readonly label: string;
  /** Patrol waypoints (tile coordinates), walked in order and then looped. The guard starts at the first. */
  readonly patrolRoute: readonly GridPoint[];
}

/** The guards in the level. All of them run the same (immutable) GUARD_DFA. */
export const GUARDS: readonly GuardDefinition[] = [
  {
    id: "G1",
    name: "Guard 1",
    color: 0xc53030,
    label: "1",
    // Upper corridor and the right half of the top room.
    patrolRoute: [
      { col: 4, row: 8 },
      { col: 35, row: 8 },
      { col: 35, row: 2 },
      { col: 22, row: 2 },
      { col: 22, row: 8 },
    ],
  },
  {
    id: "G2",
    name: "Guard 2",
    color: 0x805ad5,
    label: "2",
    // Bottom corridor and the lower-right corner.
    patrolRoute: [
      { col: 2, row: 20 },
      { col: 37, row: 20 },
      { col: 37, row: 16 },
      { col: 30, row: 16 },
      { col: 30, row: 20 },
    ],
  },
  {
    id: "G3",
    name: "Guard 3",
    color: 0xd69e2e,
    label: "3",
    // A loop around the wall block on the right of the middle room.
    patrolRoute: [
      { col: 29, row: 11 },
      { col: 34, row: 11 },
      { col: 34, row: 14 },
      { col: 29, row: 14 },
    ],
  },
];

/** Minimum time between two player noises (Space), so the key cannot flood the DFAs. */
export const NOISE_COOLDOWN_MS = 800;

/** CSS color string for a guard (for the React UI). */
export function guardCssColor(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}
