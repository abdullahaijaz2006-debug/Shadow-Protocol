// What each part of the game does in each guard DFA state (module 6). Numbers come from the
// real GUARD_CONFIG, so the explanation always matches the game.
import { GUARD_CONFIG } from "../../../game/guard/guardConfig";
import type { GuardState } from "../../../game/guard/guardDfa";

const seconds = (ms: number) => `${ms / 1000} s`;

export interface SubsystemBehaviour {
  /** Movement + pathfinding + collision (game code, reading the state). */
  readonly movement: string;
  /** Which perception checks and timers can produce the next symbol. */
  readonly perception: string;
  /** Animation, icon and sound. */
  readonly presentation: string;
}

export const GUARD_BEHAVIOUR: Readonly<Record<GuardState, SubsystemBehaviour>> = {
  PATROL: {
    movement: `Walks its patrol route at ${GUARD_CONFIG.speeds.PATROL} px/s; a BFS path leads to each next waypoint; walls stop the body.`,
    perception: `Vision cone (${GUARD_CONFIG.fovDegrees}°, ${GUARD_CONFIG.visionRadius} px) and hearing (${GUARD_CONFIG.hearingRadius} px) are active.`,
    presentation: "Walk cycle, calm ••• icon, yellow vision cone.",
  },
  ALERT: {
    movement: "Stops and turns to face where it saw you.",
    perception: `The reaction timer (${seconds(GUARD_CONFIG.alertReactionMs)}) runs; when it ends: TIMER_EXPIRED.`,
    presentation: "“!” icon, orange cone, a short alert sound.",
  },
  CHASE: {
    movement: `Runs at ${GUARD_CONFIG.speeds.CHASE} px/s along a BFS path to your last known position, re-planned every ${seconds(GUARD_CONFIG.chaseRepathMs)}.`,
    perception: `Out of sight for ${seconds(GUARD_CONFIG.lostDelayMs)} → PLAYER_LOST; within ${GUARD_CONFIG.catchDistance} px → PLAYER_CAUGHT.`,
    presentation: "“!!” icon, red cone, alarm sound, a brief screen shake.",
  },
  SEARCH: {
    movement: `Walks (${GUARD_CONFIG.speeds.SEARCH} px/s) to where you were last seen or heard, then looks around.`,
    perception: `Vision still active; the look-around timer (${seconds(GUARD_CONFIG.searchLookAroundMs)}) ends with TIMER_EXPIRED.`,
    presentation: "“?” icon, orange cone, a questioning sound.",
  },
  CAPTURE: {
    movement: "Stands still; the player is frozen (press R to restart the level).",
    perception: "Nothing more: CAPTURE is absorbing, every symbol loops back to it.",
    presentation: "“✖” icon, capture sound and a red flash.",
  },
};
