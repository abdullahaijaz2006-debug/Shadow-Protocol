// The guard's formal automaton. Pure TypeScript: no Phaser imports, so this can be unit-tested in Node.
import type { DFA, Transition } from "../../automata";

/** Q: the guard's high-level behaviour states. */
export const GUARD_STATES = ["PATROL", "ALERT", "CHASE", "SEARCH", "CAPTURE"] as const;
export type GuardState = (typeof GUARD_STATES)[number];

/** Σ: game events, emitted by perception, timers and the capture check. */
export const GUARD_SYMBOLS = ["PLAYER_SPOTTED", "PLAYER_LOST", "SOUND_HEARD", "PLAYER_CAUGHT", "TIMER_EXPIRED"] as const;
export type GuardSymbol = (typeof GUARD_SYMBOLS)[number];

/**
 * δ : Q × Σ → Q as an explicit table. The type requires an entry for every (state, symbol) pair,
 * so the DFA is complete by construction, and one key per pair makes it deterministic.
 *
 * Operational meaning of the states (what the game does while in them):
 *   PATROL  – walk the patrol route.
 *   ALERT   – just spotted the player ("!"): stop and face them for a short reaction time.
 *   CHASE   – pursue the player's last known position.
 *   SEARCH  – go to the last known position (seen or heard) and look around ("?").
 *   CAPTURE – the player is caught; absorbing state.
 *
 * TIMER_EXPIRED depends on the state: it ends ALERT's reaction delay (→ CHASE) and SEARCH's
 * look-around (→ PATROL). Pairs marked "ignored" are self-loops: that event means nothing there.
 */
export const GUARD_TRANSITIONS: Readonly<Record<GuardState, Readonly<Record<GuardSymbol, GuardState>>>> = {
  PATROL: {
    PLAYER_SPOTTED: "ALERT",
    PLAYER_LOST: "PATROL", // ignored
    SOUND_HEARD: "SEARCH",
    PLAYER_CAUGHT: "PATROL", // ignored: only emitted during CHASE
    TIMER_EXPIRED: "PATROL", // ignored
  },
  ALERT: {
    PLAYER_SPOTTED: "ALERT", // ignored: already reacting
    PLAYER_LOST: "SEARCH",
    SOUND_HEARD: "ALERT", // ignored: already reacting
    PLAYER_CAUGHT: "ALERT", // ignored: only emitted during CHASE
    TIMER_EXPIRED: "CHASE",
  },
  CHASE: {
    PLAYER_SPOTTED: "CHASE", // ignored
    PLAYER_LOST: "SEARCH",
    SOUND_HEARD: "CHASE", // ignored (the noise still updates the last known position)
    PLAYER_CAUGHT: "CAPTURE",
    TIMER_EXPIRED: "CHASE", // ignored
  },
  SEARCH: {
    PLAYER_SPOTTED: "CHASE",
    PLAYER_LOST: "SEARCH", // ignored
    SOUND_HEARD: "SEARCH", // self-loop: investigate the new sound instead
    PLAYER_CAUGHT: "SEARCH", // ignored: only emitted during CHASE
    TIMER_EXPIRED: "PATROL",
  },
  CAPTURE: {
    PLAYER_SPOTTED: "CAPTURE",
    PLAYER_LOST: "CAPTURE",
    SOUND_HEARD: "CAPTURE",
    PLAYER_CAUGHT: "CAPTURE",
    TIMER_EXPIRED: "CAPTURE",
  },
};

/**
 * The guard DFA M = (Q, Σ, δ, q₀, F) for the Milestone 2 engine.
 *
 * F = {CAPTURE} is the formal accepting set: L(M) is the set of event histories that end with the
 * player captured. Accepting is a property of the whole input string, not "the guard is doing its
 * job": PATROL, ALERT, CHASE and SEARCH are all operational states, and none of them is accepting.
 */
export const GUARD_DFA: DFA = deepFreeze({
  kind: "DFA",
  states: [...GUARD_STATES],
  alphabet: [...GUARD_SYMBOLS],
  transitions: GUARD_STATES.flatMap((from) =>
    GUARD_SYMBOLS.map((symbol): Transition => ({ from, symbol, to: GUARD_TRANSITIONS[from][symbol] })),
  ),
  start: "PATROL",
  accepting: ["CAPTURE"],
});

/**
 * Every guard shares this one definition, so it is frozen at runtime too (not only `readonly` in
 * TypeScript): all mutable simulation state lives in each guard's own AutomatonRunner.
 */
function deepFreeze<T extends object>(value: T): T {
  for (const child of Object.values(value)) {
    if (typeof child === "object" && child !== null) deepFreeze(child);
  }
  return Object.freeze(value);
}
