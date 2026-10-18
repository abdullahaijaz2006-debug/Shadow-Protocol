import { describe, expect, it } from "vitest";
import { InvalidAutomatonError, InvalidInputError } from "./errors";
import { A_STAR_OR_B_STAR, ENDS_WITH_01, THIRD_FROM_END_IS_1 } from "./examples";
import { acceptsNFA, epsilonClosure, nfaStep, runNFA } from "./nfa";
import { allStrings, chars } from "./testHelpers";
import { EPSILON, type NFA } from "./types";

/** ε-cycle q0 ⇄ q1, plus q1 -ε-> q2 and a self ε-loop on q2. Σ = {a}; q2 -a-> q3. */
const EPSILON_CYCLE: NFA = {
  kind: "NFA",
  states: ["q0", "q1", "q2", "q3"],
  alphabet: ["a"],
  transitions: [
    { from: "q0", symbol: EPSILON, to: "q1" },
    { from: "q1", symbol: EPSILON, to: "q0" },
    { from: "q1", symbol: EPSILON, to: "q2" },
    { from: "q2", symbol: EPSILON, to: "q2" },
    { from: "q2", symbol: "a", to: "q3" },
  ],
  start: "q0",
  accepting: ["q3"],
};

/** a then b, with an ε-move in the middle: q0 -a-> q1 -ε-> q2 -b-> q3. */
const A_EPSILON_B: NFA = {
  kind: "NFA",
  states: ["q0", "q1", "q2", "q3"],
  alphabet: ["a", "b"],
  transitions: [
    { from: "q0", symbol: "a", to: "q1" },
    { from: "q1", symbol: EPSILON, to: "q2" },
    { from: "q2", symbol: "b", to: "q3" },
  ],
  start: "q0",
  accepting: ["q3"],
};

describe("epsilonClosure", () => {
  it("is just {q} when q has no ε-edges (a state is always in its own closure)", () => {
    expect(epsilonClosure(ENDS_WITH_01, ["q1"])).toEqual(["q1"]);
  });

  it("follows ε-edges from the start state", () => {
    expect(epsilonClosure(A_STAR_OR_B_STAR, ["s"])).toEqual(["s", "pa", "pb"]);
  });

  it("terminates on ε-cycles and self ε-loops", () => {
    expect(epsilonClosure(EPSILON_CYCLE, ["q0"])).toEqual(["q0", "q1", "q2"]);
    expect(epsilonClosure(EPSILON_CYCLE, ["q1"])).toEqual(["q0", "q1", "q2"]);
    expect(epsilonClosure(EPSILON_CYCLE, ["q2"])).toEqual(["q2"]);
  });

  it("does not follow symbol edges", () => {
    expect(epsilonClosure(EPSILON_CYCLE, ["q0"])).not.toContain("q3");
  });

  it("is the union of the closures for a set of states, in canonical order", () => {
    expect(epsilonClosure(EPSILON_CYCLE, ["q3", "q2"])).toEqual(["q2", "q3"]);
    expect(epsilonClosure(EPSILON_CYCLE, [])).toEqual([]);
  });

  it("rejects states outside Q", () => {
    expect(() => epsilonClosure(EPSILON_CYCLE, ["q9"])).toThrow(InvalidInputError);
  });
});

describe("runNFA: the empty input string", () => {
  it("accepts ε iff ECLOSE({q₀}) contains an accepting state", () => {
    // s itself is not accepting, but its ε-closure contains pa and pb, which are.
    expect(runNFA(A_STAR_OR_B_STAR, [])).toEqual({
      accepted: true,
      initialStates: ["s", "pa", "pb"],
      finalStates: ["s", "pa", "pb"],
      trace: [],
    });
    expect(acceptsNFA(ENDS_WITH_01, [])).toBe(false);
  });
});

describe("runNFA: nondeterminism", () => {
  it("is in several states at once after a nondeterministic choice", () => {
    const result = runNFA(ENDS_WITH_01, ["0"]);
    expect(result.finalStates).toEqual(["q0", "q1"]);
    expect(result.trace[0].edges).toEqual([
      { from: "q0", symbol: "0", to: "q0" },
      { from: "q0", symbol: "0", to: "q1" },
    ]);
  });

  it("accepts if at least one branch ends in F", () => {
    expect(runNFA(ENDS_WITH_01, chars("01"))).toMatchObject({ accepted: true, finalStates: ["q0", "q2"] });
  });

  it("drops branches that have no transition (δ(q, a) = ∅)", () => {
    // From {q0, q2} on 1: q2 has no edge, so only q0 survives.
    expect(runNFA(ENDS_WITH_01, chars("011")).finalStates).toEqual(["q0"]);
  });

  it("rejects once every branch has died, and stays in ∅", () => {
    const result = runNFA(A_STAR_OR_B_STAR, chars("aba"));
    expect(result.trace.map((record) => record.to)).toEqual([["pa"], [], []]);
    expect(result.accepted).toBe(false);
  });

  it("takes ε-moves in the middle of the input", () => {
    const result = runNFA(A_EPSILON_B, chars("ab"));
    expect(result.trace[0]).toEqual({
      step: 1,
      from: ["q0"],
      symbol: "a",
      moved: ["q1"],
      to: ["q1", "q2"],
      edges: [
        { from: "q0", symbol: "a", to: "q1" },
        { from: "q1", symbol: EPSILON, to: "q2" },
      ],
    });
    expect(result.accepted).toBe(true);
  });

  it("nfaStep applies one step from a configuration", () => {
    expect(nfaStep(EPSILON_CYCLE, ["q0", "q1", "q2"], "a")).toEqual(["q3"]);
  });
});

describe("runNFA: languages (all strings up to length 8)", () => {
  it("ENDS_WITH_01", () => {
    for (const word of allStrings(["0", "1"], 8)) {
      expect(acceptsNFA(ENDS_WITH_01, word), word.join("")).toBe(word.join("").endsWith("01"));
    }
  });

  it("THIRD_FROM_END_IS_1", () => {
    for (const word of allStrings(["0", "1"], 8)) {
      expect(acceptsNFA(THIRD_FROM_END_IS_1, word), word.join("")).toBe(word[word.length - 3] === "1");
    }
  });

  it("A_STAR_OR_B_STAR", () => {
    for (const word of allStrings(["a", "b"], 8)) {
      expect(acceptsNFA(A_STAR_OR_B_STAR, word), word.join("")).toBe(/^(a*|b*)$/.test(word.join("")));
    }
  });
});

describe("runNFA: invalid input", () => {
  it("rejects input symbols outside Σ, reporting the position", () => {
    expect(() => runNFA(ENDS_WITH_01, chars("012"))).toThrow(/'2' at position 3/);
  });

  it("rejects ε as an input symbol", () => {
    expect(() => runNFA(A_STAR_OR_B_STAR, [EPSILON])).toThrow(InvalidInputError);
  });

  it("refuses to run an invalid NFA", () => {
    expect(() => runNFA({ ...ENDS_WITH_01, start: "nowhere" }, [])).toThrow(InvalidAutomatonError);
  });
});
