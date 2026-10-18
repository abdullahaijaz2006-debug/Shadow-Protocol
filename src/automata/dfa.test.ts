import { describe, expect, it } from "vitest";
import { acceptsDFA, completeWithSelfLoops, completeWithTrap, dfaStep, runDFA } from "./dfa";
import { InvalidAutomatonError, InvalidInputError } from "./errors";
import { DIVISIBLE_BY_3, ENDS_WITH_AB, EVEN_ZEROS } from "./examples";
import { allStrings, chars } from "./testHelpers";
import { EPSILON, type DFA } from "./types";
import { validateDFA } from "./validate";

/** Partial DFA for a·b*: δ(q0, b) and δ(q1, a) are undefined. */
const A_THEN_BS: DFA = {
  kind: "DFA",
  states: ["q0", "q1"],
  alphabet: ["a", "b"],
  transitions: [
    { from: "q0", symbol: "a", to: "q1" },
    { from: "q1", symbol: "b", to: "q1" },
  ],
  start: "q0",
  accepting: ["q1"],
};

describe("runDFA / acceptsDFA", () => {
  it("handles the empty input string: accepted iff q₀ ∈ F", () => {
    expect(runDFA(EVEN_ZEROS, [])).toEqual({ accepted: true, finalState: "even", trace: [] });
    expect(runDFA(ENDS_WITH_AB, [])).toEqual({ accepted: false, finalState: "q0", trace: [] });
  });

  it.each([
    ["", true],
    ["0", false],
    ["00", true],
    ["1001", true],
    ["10", false],
    ["111", true],
  ])("EVEN_ZEROS on '%s' → %s", (word, expected) => {
    expect(acceptsDFA(EVEN_ZEROS, chars(word))).toBe(expected);
  });

  it("ENDS_WITH_AB accepts exactly the strings ending in 'ab' (all strings up to length 8)", () => {
    for (const word of allStrings(["a", "b"], 8)) {
      expect(acceptsDFA(ENDS_WITH_AB, word), word.join("")).toBe(word.join("").endsWith("ab"));
    }
  });

  it("DIVISIBLE_BY_3 accepts exactly the binary numbers divisible by 3 (0..255)", () => {
    for (let n = 0; n < 256; n++) {
      expect(acceptsDFA(DIVISIBLE_BY_3, chars(n.toString(2))), String(n)).toBe(n % 3 === 0);
    }
  });

  it("records one transition per input symbol", () => {
    const result = runDFA(ENDS_WITH_AB, ["a", "b", "a"]);
    expect(result.trace).toEqual([
      { step: 1, from: "q0", symbol: "a", to: "q1" },
      { step: 2, from: "q1", symbol: "b", to: "q2" },
      { step: 3, from: "q2", symbol: "a", to: "q1" },
    ]);
    expect(result).toMatchObject({ accepted: false, finalState: "q1" });
  });

  it("works with multi-character symbols (input strings are symbol arrays)", () => {
    const guard: DFA = {
      kind: "DFA",
      states: ["PATROL", "ALERT"],
      alphabet: ["PLAYER_SPOTTED", "PLAYER_LOST"],
      transitions: [
        { from: "PATROL", symbol: "PLAYER_SPOTTED", to: "ALERT" },
        { from: "PATROL", symbol: "PLAYER_LOST", to: "PATROL" },
        { from: "ALERT", symbol: "PLAYER_SPOTTED", to: "ALERT" },
        { from: "ALERT", symbol: "PLAYER_LOST", to: "PATROL" },
      ],
      start: "PATROL",
      accepting: ["ALERT"],
    };
    expect(runDFA(guard, ["PLAYER_SPOTTED"]).finalState).toBe("ALERT");
    expect(acceptsDFA(guard, ["PLAYER_SPOTTED", "PLAYER_LOST"])).toBe(false);
  });

  it("rejects input symbols outside Σ, reporting the position", () => {
    expect(() => runDFA(ENDS_WITH_AB, ["a", "c"])).toThrow(InvalidInputError);
    expect(() => runDFA(ENDS_WITH_AB, ["a", "c"])).toThrow(/'c' at position 2/);
  });

  it("rejects ε as an input symbol (ε is the empty string, not a symbol)", () => {
    expect(() => runDFA(ENDS_WITH_AB, [EPSILON])).toThrow(InvalidInputError);
  });

  it("refuses to run an incomplete DFA instead of silently defaulting", () => {
    expect(() => runDFA(A_THEN_BS, ["a"])).toThrow(InvalidAutomatonError);
    expect(() => runDFA(A_THEN_BS, ["a"])).toThrow(/δ\(q0, b\) is undefined/);
  });
});

describe("dfaStep", () => {
  it("applies δ once", () => {
    expect(dfaStep(DIVISIBLE_BY_3, "r1", "0")).toBe("r2");
  });

  it("rejects states outside Q and symbols outside Σ", () => {
    expect(() => dfaStep(DIVISIBLE_BY_3, "r7", "0")).toThrow(InvalidInputError);
    expect(() => dfaStep(DIVISIBLE_BY_3, "r0", "2")).toThrow(InvalidInputError);
  });
});

describe("completeWithSelfLoops", () => {
  const complete = completeWithSelfLoops(A_THEN_BS);

  it("produces a valid, complete DFA", () => {
    expect(validateDFA(complete)).toEqual([]);
  });

  it("adds a self-loop for each missing pair and keeps the original edges", () => {
    expect(complete.transitions).toEqual([
      ...A_THEN_BS.transitions,
      { from: "q0", symbol: "b", to: "q0" },
      { from: "q1", symbol: "a", to: "q1" },
    ]);
    expect(complete.states).toEqual(A_THEN_BS.states);
  });

  it("means 'ignore the symbol': now accepts any string containing an a", () => {
    for (const word of allStrings(["a", "b"], 6)) {
      expect(acceptsDFA(complete, word), word.join("")).toBe(word.includes("a"));
    }
  });

  it("does not mutate the input DFA", () => {
    expect(A_THEN_BS.transitions).toHaveLength(2);
  });
});

describe("completeWithTrap", () => {
  const complete = completeWithTrap(A_THEN_BS);

  it("produces a valid, complete DFA with a non-accepting trap state", () => {
    expect(validateDFA(complete)).toEqual([]);
    expect(complete.states).toEqual(["q0", "q1", "TRAP"]);
    expect(complete.accepting).toEqual(["q1"]);
  });

  it("preserves the language: exactly a·b*", () => {
    for (const word of allStrings(["a", "b"], 6)) {
      expect(acceptsDFA(complete, word), word.join("")).toBe(/^ab*$/.test(word.join("")));
    }
  });

  it("stays in the trap once it is entered", () => {
    expect(runDFA(complete, chars("baab")).trace.map((record) => record.to)).toEqual(["TRAP", "TRAP", "TRAP", "TRAP"]);
  });

  it("picks a fresh name if the trap name is already a state", () => {
    const named = completeWithTrap({ ...A_THEN_BS, states: ["q0", "q1", "TRAP"] });
    expect(named.states).toEqual(["q0", "q1", "TRAP", "TRAP'"]);
    expect(completeWithTrap(A_THEN_BS, "dead").states).toContain("dead");
  });

  it("returns an already-complete DFA unchanged", () => {
    expect(completeWithTrap(EVEN_ZEROS)).toBe(EVEN_ZEROS);
  });
});

describe("completion helpers only fix missing transitions", () => {
  const broken: DFA = { ...A_THEN_BS, transitions: [...A_THEN_BS.transitions, { from: "q0", symbol: "a", to: "q0" }] };

  it.each([completeWithSelfLoops, completeWithTrap])("still rejects duplicate transitions", (complete) => {
    expect(() => complete(broken)).toThrow(InvalidAutomatonError);
  });
});
