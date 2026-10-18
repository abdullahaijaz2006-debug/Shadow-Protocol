// Textbook automata used by the tests, and later as presets in the automata laboratory.
import { EPSILON, type DFA, type InputSymbol, type NFA, type State, type Transition } from "./types";

function t(from: State, symbol: InputSymbol, to: State): Transition {
  return { from, symbol, to };
}

/** DFA over {0,1}: strings with an even number of 0s (including ε). */
export const EVEN_ZEROS: DFA = {
  kind: "DFA",
  states: ["even", "odd"],
  alphabet: ["0", "1"],
  transitions: [t("even", "0", "odd"), t("even", "1", "even"), t("odd", "0", "even"), t("odd", "1", "odd")],
  start: "even",
  accepting: ["even"],
};

/** DFA over {a,b}: strings ending in "ab". q1 = "just read a", q2 = "just read ab". */
export const ENDS_WITH_AB: DFA = {
  kind: "DFA",
  states: ["q0", "q1", "q2"],
  alphabet: ["a", "b"],
  transitions: [
    t("q0", "a", "q1"),
    t("q0", "b", "q0"),
    t("q1", "a", "q1"),
    t("q1", "b", "q2"),
    t("q2", "a", "q1"),
    t("q2", "b", "q0"),
  ],
  start: "q0",
  accepting: ["q2"],
};

/** DFA over {0,1}: binary numbers divisible by 3. State rN = "value read so far ≡ N (mod 3)". */
export const DIVISIBLE_BY_3: DFA = {
  kind: "DFA",
  states: ["r0", "r1", "r2"],
  alphabet: ["0", "1"],
  transitions: [
    t("r0", "0", "r0"),
    t("r0", "1", "r1"),
    t("r1", "0", "r2"),
    t("r1", "1", "r0"),
    t("r2", "0", "r1"),
    t("r2", "1", "r2"),
  ],
  start: "r0",
  accepting: ["r0"],
};

/** NFA over {0,1}: strings ending in "01". On a 0, q0 "guesses" whether the end has begun. */
export const ENDS_WITH_01: NFA = {
  kind: "NFA",
  states: ["q0", "q1", "q2"],
  alphabet: ["0", "1"],
  transitions: [t("q0", "0", "q0"), t("q0", "1", "q0"), t("q0", "0", "q1"), t("q1", "1", "q2")],
  start: "q0",
  accepting: ["q2"],
};

/**
 * NFA over {0,1}: the third symbol from the end is 1. Only 4 states, but its minimal DFA needs
 * 2³ = 8: the classic example of the exponential blow-up of subset construction.
 */
export const THIRD_FROM_END_IS_1: NFA = {
  kind: "NFA",
  states: ["q0", "q1", "q2", "q3"],
  alphabet: ["0", "1"],
  transitions: [
    t("q0", "0", "q0"),
    t("q0", "1", "q0"),
    t("q0", "1", "q1"),
    t("q1", "0", "q2"),
    t("q1", "1", "q2"),
    t("q2", "0", "q3"),
    t("q2", "1", "q3"),
  ],
  start: "q0",
  accepting: ["q3"],
};

/** ε-NFA over {a,b}: the language a* ∪ b*. From s, ε-edges choose one branch before reading. */
export const A_STAR_OR_B_STAR: NFA = {
  kind: "NFA",
  states: ["s", "pa", "pb"],
  alphabet: ["a", "b"],
  transitions: [t("s", EPSILON, "pa"), t("s", EPSILON, "pb"), t("pa", "a", "pa"), t("pb", "b", "pb")],
  start: "s",
  accepting: ["pa", "pb"],
};
