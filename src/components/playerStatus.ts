// The player's situation, derived from the guards' DFA states in the snapshot. Pure TypeScript.
import type { GuardSnapshot } from "../game/bridge";
import type { GuardState } from "../game/guard/guardDfa";

export type PlayerStatusKind = "hidden" | "searched" | "spotted" | "chased" | "caught";

export interface PlayerStatus {
  readonly kind: PlayerStatusKind;
  readonly label: string;
  readonly detail: string;
}

/** The most serious guard state wins: CAPTURE > CHASE > ALERT > SEARCH > PATROL. */
const PRIORITY: readonly [GuardState, PlayerStatusKind, string, (names: string) => string][] = [
  ["CAPTURE", "caught", "CAUGHT", (n) => `by ${n}`],
  ["CHASE", "chased", "CHASED", (n) => `by ${n}`],
  ["ALERT", "spotted", "SPOTTED", (n) => `by ${n}`],
  ["SEARCH", "searched", "UNDER SEARCH", (n) => `${n} investigating`],
];

export function playerStatus(guards: readonly GuardSnapshot[]): PlayerStatus {
  for (const [state, kind, label, detail] of PRIORITY) {
    const who = guards.filter((g) => g.state === state).map((g) => g.name);
    if (who.length > 0) return { kind, label, detail: detail(who.join(", ")) };
  }
  return { kind: "hidden", label: "HIDDEN", detail: "no guard is aware of you" };
}

/** A short text glyph for each guard state (matches the in-game icons). */
export const STATE_GLYPH: Readonly<Record<GuardState, string>> = {
  PATROL: "•••",
  ALERT: "!",
  CHASE: "!!",
  SEARCH: "?",
  CAPTURE: "✖",
};
