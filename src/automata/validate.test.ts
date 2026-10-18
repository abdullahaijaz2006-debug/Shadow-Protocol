import { describe, expect, it } from "vitest";
import { InvalidAutomatonError } from "./errors";
import {
  A_STAR_OR_B_STAR,
  DIVISIBLE_BY_3,
  ENDS_WITH_01,
  ENDS_WITH_AB,
  EVEN_ZEROS,
  THIRD_FROM_END_IS_1,
} from "./examples";
import { EPSILON, type DFA } from "./types";
import { assertValid, validateDFA, validateNFA, type IssueCode } from "./validate";

function codes(issues: { code: IssueCode }[]): IssueCode[] {
  return issues.map((issue) => issue.code);
}

describe("validateDFA", () => {
  it.each([EVEN_ZEROS, ENDS_WITH_AB, DIVISIBLE_BY_3])("accepts a valid DFA", (dfa) => {
    expect(validateDFA(dfa)).toEqual([]);
  });

  it("reports a missing transition with the exact (state, symbol) pair", () => {
    const dfa: DFA = {
      ...EVEN_ZEROS,
      transitions: EVEN_ZEROS.transitions.filter((e) => !(e.from === "odd" && e.symbol === "1")),
    };
    expect(validateDFA(dfa)).toEqual([expect.objectContaining({ code: "MISSING_TRANSITION", state: "odd", symbol: "1" })]);
  });

  it("reports every missing transition, not just the first", () => {
    const dfa: DFA = { ...EVEN_ZEROS, transitions: [] };
    expect(codes(validateDFA(dfa))).toEqual(Array(4).fill("MISSING_TRANSITION"));
  });

  it("rejects two transitions for the same (state, symbol) pair (nondeterminism)", () => {
    const dfa: DFA = { ...EVEN_ZEROS, transitions: [...EVEN_ZEROS.transitions, { from: "even", symbol: "0", to: "even" }] };
    const issues = validateDFA(dfa);
    expect(issues).toEqual([expect.objectContaining({ code: "DUPLICATE_TRANSITION", state: "even", symbol: "0" })]);
    expect(issues[0].message).toContain("→ odd, → even");
  });

  it("rejects an exact duplicate of an existing edge", () => {
    const dfa: DFA = { ...EVEN_ZEROS, transitions: [...EVEN_ZEROS.transitions, EVEN_ZEROS.transitions[0]] };
    expect(codes(validateDFA(dfa))).toEqual(["DUPLICATE_TRANSITION"]);
  });

  it("rejects ε-transitions", () => {
    const dfa: DFA = { ...EVEN_ZEROS, transitions: [...EVEN_ZEROS.transitions, { from: "even", symbol: EPSILON, to: "odd" }] };
    expect(codes(validateDFA(dfa))).toEqual(["EPSILON_IN_DFA"]);
  });

  it("rejects edges that use states outside Q or symbols outside Σ", () => {
    const dfa: DFA = {
      ...EVEN_ZEROS,
      transitions: [...EVEN_ZEROS.transitions, { from: "even", symbol: "2", to: "odd" }, { from: "ghost", symbol: "0", to: "even" }],
    };
    expect(codes(validateDFA(dfa))).toEqual(["UNKNOWN_SYMBOL", "UNKNOWN_STATE"]);
  });

  it("requires q₀ ∈ Q and F ⊆ Q", () => {
    const dfa: DFA = { ...EVEN_ZEROS, start: "nowhere", accepting: ["even", "missing"] };
    expect(codes(validateDFA(dfa))).toEqual(["START_NOT_IN_STATES", "ACCEPTING_NOT_IN_STATES"]);
  });

  it("requires a non-empty Q", () => {
    const dfa: DFA = { kind: "DFA", states: [], alphabet: [], transitions: [], start: "q0", accepting: [] };
    expect(codes(validateDFA(dfa))).toEqual(["EMPTY_STATES", "START_NOT_IN_STATES"]);
  });

  it("rejects duplicate states, duplicate symbols and ε in Σ", () => {
    const dfa: DFA = { ...EVEN_ZEROS, states: ["even", "odd", "odd"], alphabet: ["0", "1", "1", EPSILON] };
    expect(codes(validateDFA(dfa))).toEqual(
      expect.arrayContaining(["DUPLICATE_STATE", "DUPLICATE_SYMBOL", "EPSILON_IN_ALPHABET"]),
    );
  });
});

describe("validateNFA", () => {
  it.each([ENDS_WITH_01, THIRD_FROM_END_IS_1, A_STAR_OR_B_STAR])(
    "accepts a valid NFA with missing, multiple and ε-transitions",
    (nfa) => {
      expect(validateNFA(nfa)).toEqual([]);
    },
  );

  it("still checks structure (states and symbols must exist)", () => {
    const nfa = { ...ENDS_WITH_01, transitions: [{ from: "q0", symbol: "x", to: "q9" }] };
    expect(codes(validateNFA(nfa))).toEqual(["UNKNOWN_STATE", "UNKNOWN_SYMBOL"]);
  });
});

describe("assertValid", () => {
  it("throws an InvalidAutomatonError that lists every issue", () => {
    const dfa: DFA = { ...EVEN_ZEROS, transitions: [] };
    try {
      assertValid(dfa);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidAutomatonError);
      expect((error as InvalidAutomatonError).issues).toHaveLength(4);
      expect((error as Error).message).toContain("δ(even, 0) is undefined");
    }
  });

  it("does nothing for a valid automaton", () => {
    expect(() => assertValid(ENDS_WITH_01)).not.toThrow();
  });
});
