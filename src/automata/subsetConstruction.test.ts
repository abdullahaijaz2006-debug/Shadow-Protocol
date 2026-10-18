import { describe, expect, it } from "vitest";
import { acceptsDFA, runDFA } from "./dfa";
import { InvalidAutomatonError } from "./errors";
import { A_STAR_OR_B_STAR, ENDS_WITH_01, THIRD_FROM_END_IS_1 } from "./examples";
import { acceptsNFA, runNFA } from "./nfa";
import { nfaToDfa, subsetName } from "./subsetConstruction";
import { allStrings } from "./testHelpers";
import { EPSILON, type NFA } from "./types";
import { validateDFA } from "./validate";

/** ε-NFA with an ε-cycle: strings over {a,b} containing "ab". */
const CONTAINS_AB: NFA = {
  kind: "NFA",
  states: ["s", "loop", "sawA", "done"],
  alphabet: ["a", "b"],
  transitions: [
    { from: "s", symbol: EPSILON, to: "loop" },
    { from: "loop", symbol: EPSILON, to: "s" },
    { from: "loop", symbol: "a", to: "loop" },
    { from: "loop", symbol: "b", to: "loop" },
    { from: "loop", symbol: "a", to: "sawA" },
    { from: "sawA", symbol: "b", to: "done" },
    { from: "done", symbol: "a", to: "done" },
    { from: "done", symbol: "b", to: "done" },
  ],
  start: "s",
  accepting: ["done"],
};

/**
 * NFA with state names designed to break naive "{" + join(",") + "}" naming. It reaches both the
 * subset {"a,b"} (one state) and {a, b} (two states), which would both be named "{a,b}"; and it has
 * a real state called "∅" as well as reaching the empty set ∅. "" is a state with an empty name.
 */
const UNUSUAL_NAMES: NFA = {
  kind: "NFA",
  states: ["a,b", "a", "b", "{a}", "∅", ""],
  alphabet: ["0", "1"],
  transitions: [
    { from: "a,b", symbol: "0", to: "a" },
    { from: "a,b", symbol: "0", to: "b" },
    { from: "a,b", symbol: "1", to: "a,b" },
    { from: "a", symbol: "1", to: "∅" },
    { from: "b", symbol: "1", to: "{a}" },
    { from: "{a}", symbol: EPSILON, to: "" },
    { from: "", symbol: "0", to: "a,b" },
  ],
  start: "a,b",
  accepting: ["a", "∅"],
};

const NFAS: [string, NFA][] = [
  ["ENDS_WITH_01", ENDS_WITH_01],
  ["THIRD_FROM_END_IS_1", THIRD_FROM_END_IS_1],
  ["A_STAR_OR_B_STAR", A_STAR_OR_B_STAR],
  ["CONTAINS_AB (ε-cycle)", CONTAINS_AB],
  ["UNUSUAL_NAMES", UNUSUAL_NAMES],
];

describe.each(NFAS)("nfaToDfa(%s)", (_name, nfa) => {
  const { dfa, subsets } = nfaToDfa(nfa);

  it("produces a valid DFA (complete and deterministic)", () => {
    expect(validateDFA(dfa)).toEqual([]);
  });

  it("is language-equivalent to the NFA on every string up to length 8", () => {
    for (const word of allStrings(nfa.alphabet, 8)) {
      expect(acceptsDFA(dfa, word), word.join("")).toBe(acceptsNFA(nfa, word));
    }
  });

  it("each DFA state stands for exactly the NFA configuration it simulates", () => {
    for (const word of allStrings(nfa.alphabet, 5)) {
      expect(subsets[runDFA(dfa, word).finalState]).toEqual(runNFA(nfa, word).finalStates);
    }
  });

  it("is deterministic: converting twice gives an identical result", () => {
    expect(nfaToDfa(nfa)).toEqual({ dfa, subsets });
  });
});

describe("nfaToDfa: textbook results", () => {
  it("ENDS_WITH_01 becomes the 3-state DFA from the textbook", () => {
    const { dfa } = nfaToDfa(ENDS_WITH_01);
    expect(dfa).toEqual({
      kind: "DFA",
      states: ["{q0}", "{q0,q1}", "{q0,q2}"],
      alphabet: ["0", "1"],
      transitions: [
        { from: "{q0}", symbol: "0", to: "{q0,q1}" },
        { from: "{q0}", symbol: "1", to: "{q0}" },
        { from: "{q0,q1}", symbol: "0", to: "{q0,q1}" },
        { from: "{q0,q1}", symbol: "1", to: "{q0,q2}" },
        { from: "{q0,q2}", symbol: "0", to: "{q0,q1}" },
        { from: "{q0,q2}", symbol: "1", to: "{q0}" },
      ],
      start: "{q0}",
      accepting: ["{q0,q2}"],
    });
  });

  it("THIRD_FROM_END_IS_1 shows the exponential blow-up: 4 NFA states → 2³ = 8 DFA states", () => {
    const { dfa, subsets } = nfaToDfa(THIRD_FROM_END_IS_1);
    expect(dfa.states).toHaveLength(8);
    expect(Object.values(subsets).every((set) => set.includes("q0"))).toBe(true);
    expect(dfa.states).not.toContain("∅");
  });

  it("A_STAR_OR_B_STAR starts at ECLOSE({s}) and needs a ∅ trap state", () => {
    const { dfa } = nfaToDfa(A_STAR_OR_B_STAR);
    expect(dfa.start).toBe("{s,pa,pb}");
    expect(dfa.states).toEqual(["{s,pa,pb}", "{pa}", "{pb}", "∅"]);
    expect(dfa.accepting).toEqual(["{s,pa,pb}", "{pa}", "{pb}"]);
    expect(dfa.transitions.filter((edge) => edge.from === "∅")).toEqual([
      { from: "∅", symbol: "a", to: "∅" },
      { from: "∅", symbol: "b", to: "∅" },
    ]);
  });

  it("rejects an invalid NFA", () => {
    expect(() => nfaToDfa({ ...ENDS_WITH_01, accepting: ["q7"] })).toThrow(InvalidAutomatonError);
  });
});

describe("nfaToDfa: unusual state names", () => {
  const { dfa, subsets } = nfaToDfa(UNUSUAL_NAMES);

  it("keeps subsets that a naive join would merge as separate DFA states", () => {
    expect(dfa.states).toEqual(['{"a,b"}', "{a,b}", "∅", '{"{a}","∅",""}']);
    expect(subsets['{"a,b"}']).toEqual(["a,b"]);
    expect(subsets["{a,b}"]).toEqual(["a", "b"]);
  });

  it("distinguishes the empty-set trap from a real state named ∅", () => {
    expect(subsets["∅"]).toEqual([]);
    expect(subsets['{"{a}","∅",""}']).toEqual(["{a}", "∅", ""]);
    expect(dfa.accepting).toEqual(["{a,b}", '{"{a}","∅",""}']);
    expect(dfa.accepting).not.toContain("∅");
  });

  it("gives every DFA state a distinct name", () => {
    expect(new Set(dfa.states).size).toBe(dfa.states.length);
  });
});

describe("subsetName", () => {
  it("names sets like the textbook, with ∅ for the empty set", () => {
    expect(subsetName(["q0", "q2"])).toBe("{q0,q2}");
    expect(subsetName(["PATROL", "ALERT"])).toBe("{PATROL,ALERT}");
    expect(subsetName([])).toBe("∅");
  });

  it("quotes names containing commas, braces, quotes, backslashes or ∅, and the empty name", () => {
    expect(subsetName(["a,b"])).toBe('{"a,b"}');
    expect(subsetName(["{a}", "b"])).toBe('{"{a}",b}');
    expect(subsetName(["∅"])).toBe('{"∅"}');
    expect(subsetName([""])).toBe('{""}');
    expect(subsetName(['say "hi"', "x\\y"])).toBe('{"say \\"hi\\"","x\\\\y"}');
  });

  it("separates the classic collisions", () => {
    expect(subsetName(["a,b"])).not.toBe(subsetName(["a", "b"]));
    expect(subsetName(["{a,a}"])).not.toBe(subsetName(["{a", "a}"]));
    expect(subsetName(["∅"])).not.toBe(subsetName([]));
    expect(subsetName(['a","b'])).not.toBe(subsetName(["a", "b"]));
  });

  it("is injective: all 2¹² subsets of tricky names get distinct names", () => {
    const tricky = ["a", "b", "a,b", "{a}", "{a", "a}", "{a,a}", "∅", "", '"', "\\", '"a","b"'];
    const names = new Set<string>();
    for (let mask = 0; mask < 1 << tricky.length; mask++) {
      names.add(subsetName(tricky.filter((_state, bit) => mask & (1 << bit))));
    }
    expect(names.size).toBe(1 << tricky.length);
  });
});
