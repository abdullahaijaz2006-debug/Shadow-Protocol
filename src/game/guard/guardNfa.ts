// A nondeterministic "suspicious guard" for the NFA ⇄ DFA comparison mode. Pure TypeScript.
//
// Demonstration only: the guards in the level are always driven by GUARD_DFA. This NFA uses the
// same alphabet Σ, so the same event sequences can be fed to it.
import { EPSILON, type NFA, type Transition } from "../../automata";
import { GUARD_SYMBOLS } from "./guardDfa";

export const GUARD_NFA_STATES = ["PATROL", "ALERT", "SEARCH", "CHASE", "CAPTURE"] as const;

function t(from: string, symbol: string, to: string): Transition {
  return { from, symbol, to };
}

/**
 * N = (Q, Σ, δ, q₀, F) with δ : Q × (Σ ∪ {ε}) → 𝒫(Q).
 *
 *   PATROL --SOUND_HEARD--> {ALERT, SEARCH}   a sound might be an intruder or nothing: both paths stay open
 *   ALERT  --ε-->           CHASE             an alert guard may already be chasing, without reading input
 *   SEARCH --ε-->           PATROL            a search may be silently given up
 *
 * A (state, symbol) pair with no edge means δ = ∅: that computation path dies (e.g. an unaware
 * guard in PATROL cannot be "caught"). F = {CAPTURE} is the formal accepting set: N accepts the
 * event sequences for which at least one computation path ends in a capture.
 */
export const GUARD_NFA: NFA = Object.freeze({
  kind: "NFA",
  states: [...GUARD_NFA_STATES],
  alphabet: [...GUARD_SYMBOLS],
  transitions: [
    t("PATROL", "PLAYER_SPOTTED", "ALERT"),
    t("PATROL", "SOUND_HEARD", "ALERT"),
    t("PATROL", "SOUND_HEARD", "SEARCH"),
    t("PATROL", "PLAYER_LOST", "PATROL"),
    t("PATROL", "TIMER_EXPIRED", "PATROL"),
    t("ALERT", EPSILON, "CHASE"),
    t("ALERT", "TIMER_EXPIRED", "SEARCH"),
    t("SEARCH", EPSILON, "PATROL"),
    t("SEARCH", "PLAYER_SPOTTED", "CHASE"),
    t("CHASE", "PLAYER_SPOTTED", "CHASE"),
    t("CHASE", "PLAYER_LOST", "SEARCH"),
    t("CHASE", "PLAYER_CAUGHT", "CAPTURE"),
    ...GUARD_SYMBOLS.map((symbol) => t("CAPTURE", symbol, "CAPTURE")),
  ],
  start: "PATROL",
  accepting: ["CAPTURE"],
});
