import { describe, expect, it } from "vitest";
import { acceptsDFA, acceptsNFA, epsilonClosure, EPSILON, nfaToDfa, runDFA, runNFA, validateDFA, validateNFA } from "../../automata";
import { allStrings } from "../../automata/testHelpers";
import { GUARD_SYMBOLS, type GuardSymbol } from "./guardDfa";
import { GUARD_NFA, GUARD_NFA_STATES } from "./guardNfa";

const active = (input: GuardSymbol[]) => runNFA(GUARD_NFA, input).finalStates;

describe("GUARD_NFA: definition", () => {
  it("is a valid NFA for the Milestone 2 engine", () => {
    expect(validateNFA(GUARD_NFA)).toEqual([]);
  });

  it("uses the guard alphabet, starts in PATROL and has F = {CAPTURE}", () => {
    expect(GUARD_NFA.alphabet).toEqual([...GUARD_SYMBOLS]);
    expect(GUARD_NFA.states).toEqual([...GUARD_NFA_STATES]);
    expect(GUARD_NFA.start).toBe("PATROL");
    expect(GUARD_NFA.accepting).toEqual(["CAPTURE"]);
  });

  it("is genuinely nondeterministic: one (state, symbol) has two targets, and there are ε-edges", () => {
    const sound = GUARD_NFA.transitions.filter((t) => t.from === "PATROL" && t.symbol === "SOUND_HEARD").map((t) => t.to);
    expect(sound).toEqual(["ALERT", "SEARCH"]);
    expect(GUARD_NFA.transitions.filter((t) => t.symbol === EPSILON)).toEqual([
      { from: "ALERT", symbol: EPSILON, to: "CHASE" },
      { from: "SEARCH", symbol: EPSILON, to: "PATROL" },
    ]);
  });
});

describe("GUARD_NFA: ε-closure", () => {
  it.each([
    [["PATROL"], ["PATROL"]],
    [["ALERT"], ["ALERT", "CHASE"]],
    [["SEARCH"], ["PATROL", "SEARCH"]],
    [["CHASE"], ["CHASE"]],
    [["ALERT", "SEARCH"], ["PATROL", "ALERT", "SEARCH", "CHASE"]],
  ])("ECLOSE(%j) = %j", (states, closure) => {
    expect(epsilonClosure(GUARD_NFA, states)).toEqual(closure);
  });
});

describe("GUARD_NFA: active-state sets", () => {
  it("handles the empty input: active set ECLOSE({PATROL}) = {PATROL}, rejected", () => {
    expect(runNFA(GUARD_NFA, [])).toMatchObject({ initialStates: ["PATROL"], finalStates: ["PATROL"], accepted: false });
  });

  it("applies the ε-closure after the symbol move: spotted → move {ALERT}, closure {ALERT, CHASE}", () => {
    const [step] = runNFA(GUARD_NFA, ["PLAYER_SPOTTED"]).trace;
    expect(step.moved).toEqual(["ALERT"]);
    expect(step.to).toEqual(["ALERT", "CHASE"]);
    expect(step.edges).toEqual([
      { from: "PATROL", symbol: "PLAYER_SPOTTED", to: "ALERT" },
      { from: "ALERT", symbol: EPSILON, to: "CHASE" },
    ]);
  });

  it("follows every path at once: a sound makes all four non-final states active", () => {
    const [step] = runNFA(GUARD_NFA, ["SOUND_HEARD"]).trace;
    expect(step.moved).toEqual(["ALERT", "SEARCH"]);
    expect(step.to).toEqual(["PATROL", "ALERT", "SEARCH", "CHASE"]);
  });

  it("uses ε-closed sets as the starting point of each step", () => {
    // From {ALERT, CHASE}: CHASE (added only by ε) is the state that can read 'caught'.
    expect(active(["PLAYER_SPOTTED", "PLAYER_CAUGHT"])).toEqual(["CAPTURE"]);
  });

  it("drops dead paths, and the set becomes ∅ when every path dies", () => {
    expect(active(["PLAYER_CAUGHT"])).toEqual([]);
    expect(active(["PLAYER_CAUGHT", "PLAYER_SPOTTED", "SOUND_HEARD"])).toEqual([]);
  });

  it.each([
    [["SOUND_HEARD", "PLAYER_CAUGHT"], true],
    [["PLAYER_SPOTTED", "PLAYER_CAUGHT"], true],
    [["PLAYER_SPOTTED", "TIMER_EXPIRED", "PLAYER_SPOTTED", "PLAYER_CAUGHT"], true],
    [["SOUND_HEARD", "TIMER_EXPIRED", "TIMER_EXPIRED"], false],
    [["PLAYER_CAUGHT"], false],
    [[], false],
  ] as [GuardSymbol[], boolean][])("%j accepted = %s", (input, accepted) => {
    expect(acceptsNFA(GUARD_NFA, input)).toBe(accepted);
  });
});

describe("GUARD_NFA → DFA (subset construction)", () => {
  const { dfa, subsets } = nfaToDfa(GUARD_NFA);

  it("produces a valid, complete, deterministic DFA with 7 reachable subsets (including ∅)", () => {
    expect(validateDFA(dfa)).toEqual([]);
    expect(dfa.states).toHaveLength(7);
    expect(dfa.states).toContain("∅");
    expect(dfa.start).toBe("{PATROL}");
    expect(dfa.accepting).toEqual(["{CAPTURE}"]);
  });

  it("recognizes exactly the same language (all 3906 strings over Σ up to length 5)", () => {
    for (const input of allStrings(GUARD_SYMBOLS, 5)) {
      expect(acceptsDFA(dfa, input), input.join(" ")).toBe(acceptsNFA(GUARD_NFA, input));
    }
  });

  it("agrees on the empty string", () => {
    expect(acceptsDFA(dfa, [])).toBe(false);
    expect(acceptsNFA(GUARD_NFA, [])).toBe(false);
  });

  it("after every input, the DFA state stands for exactly the NFA's active set", () => {
    for (const input of allStrings(GUARD_SYMBOLS, 4)) {
      expect(subsets[runDFA(dfa, input).finalState], input.join(" ")).toEqual(runNFA(GUARD_NFA, input).finalStates);
    }
  });

  it("accepting DFA states are exactly the subsets containing an NFA accepting state", () => {
    for (const state of dfa.states) {
      expect(dfa.accepting.includes(state), state).toBe(subsets[state].includes("CAPTURE"));
    }
  });
});
