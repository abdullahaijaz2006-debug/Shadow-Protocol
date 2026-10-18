import { describe, expect, it } from "vitest";
import { runDFA } from "./dfa";
import { InvalidAutomatonError, InvalidInputError } from "./errors";
import { A_STAR_OR_B_STAR, ENDS_WITH_01, ENDS_WITH_AB } from "./examples";
import { runNFA } from "./nfa";
import { AutomatonRunner } from "./runner";
import { chars } from "./testHelpers";
import { EPSILON } from "./types";

describe("AutomatonRunner with a DFA", () => {
  it("starts in {q₀} with an empty history", () => {
    const runner = new AutomatonRunner(ENDS_WITH_AB);
    expect(runner.current).toEqual(["q0"]);
    expect(runner.history).toEqual([]);
    expect(runner.input).toEqual([]);
    expect(runner.isAccepting).toBe(false);
  });

  it("feeds symbols one at a time and records each transition", () => {
    const runner = new AutomatonRunner(ENDS_WITH_AB);
    expect(runner.feed("a")).toEqual({
      step: 1,
      from: ["q0"],
      symbol: "a",
      to: ["q1"],
      edges: [{ from: "q0", symbol: "a", to: "q1" }],
    });
    runner.feed("b");
    expect(runner.current).toEqual(["q2"]);
    expect(runner.isAccepting).toBe(true);
    expect(runner.input).toEqual(["a", "b"]);
    expect(runner.history.map((record) => record.step)).toEqual([1, 2]);
  });

  it("agrees with runDFA", () => {
    const word = chars("abbaab");
    const runner = AutomatonRunner.replay(ENDS_WITH_AB, word);
    const result = runDFA(ENDS_WITH_AB, word);
    expect(runner.history.map((record) => [record.from[0], record.symbol, record.to[0]])).toEqual(
      result.trace.map((record) => [record.from, record.symbol, record.to]),
    );
    expect(runner.isAccepting).toBe(result.accepted);
  });

  it("refuses an incomplete DFA", () => {
    const incomplete = { ...ENDS_WITH_AB, transitions: ENDS_WITH_AB.transitions.slice(1) };
    expect(() => new AutomatonRunner(incomplete)).toThrow(InvalidAutomatonError);
  });
});

describe("AutomatonRunner with an NFA", () => {
  it("starts in ECLOSE({q₀})", () => {
    const runner = new AutomatonRunner(A_STAR_OR_B_STAR);
    expect(runner.current).toEqual(["s", "pa", "pb"]);
    expect(runner.isAccepting).toBe(true);
  });

  it("tracks the set of active states and agrees with runNFA", () => {
    const word = chars("0101");
    const runner = AutomatonRunner.replay(ENDS_WITH_01, word);
    const { trace, accepted } = runNFA(ENDS_WITH_01, word);
    expect(runner.history).toEqual(
      trace.map((record) => ({ step: record.step, from: record.from, symbol: record.symbol, to: record.to, edges: record.edges })),
    );
    expect(runner.current).toEqual(["q0", "q2"]);
    expect(runner.isAccepting).toBe(accepted);
  });
});

describe("AutomatonRunner: invalid input", () => {
  it("rejects a symbol outside Σ and leaves the runner unchanged", () => {
    const runner = new AutomatonRunner(ENDS_WITH_AB);
    runner.feed("a");
    expect(() => runner.feed("c")).toThrow(InvalidInputError);
    expect(() => runner.feed(EPSILON)).toThrow(InvalidInputError);
    expect(runner.current).toEqual(["q1"]);
    expect(runner.history).toHaveLength(1);
    expect(runner.input).toEqual(["a"]);
  });

  it("feedAll is all-or-nothing", () => {
    const runner = new AutomatonRunner(ENDS_WITH_01);
    expect(() => runner.feedAll(chars("01x1"))).toThrow(/'x' at position 3/);
    expect(runner.history).toEqual([]);
    expect(runner.current).toEqual(["q0"]);
  });
});

describe("AutomatonRunner: reset and deterministic replay", () => {
  it("reset returns to the initial configuration and clears the history", () => {
    const runner = AutomatonRunner.replay(ENDS_WITH_01, chars("001"));
    runner.reset();
    expect(runner.current).toEqual(["q0"]);
    expect(runner.history).toEqual([]);
    expect(runner.input).toEqual([]);
  });

  it.each([
    ["DFA", ENDS_WITH_AB, chars("abbabab")],
    ["NFA", ENDS_WITH_01, chars("0110101")],
    ["ε-NFA", A_STAR_OR_B_STAR, chars("aaab")],
  ] as const)("replaying a %s run's input reproduces its history exactly", (_kind, automaton, word) => {
    const original = new AutomatonRunner(automaton);
    for (const symbol of word) original.feed(symbol);

    const replayed = AutomatonRunner.replay(automaton, original.input);
    expect(replayed.history).toEqual(original.history);
    expect(replayed.current).toEqual(original.current);
    expect(replayed.isAccepting).toBe(original.isAccepting);

    // The same runner, reset and fed again, also reproduces it.
    original.reset();
    original.feedAll(word);
    expect(original.history).toEqual(replayed.history);
  });

  it("replaying the empty input gives the initial configuration", () => {
    const runner = AutomatonRunner.replay(A_STAR_OR_B_STAR, []);
    expect(runner.history).toEqual([]);
    expect(runner.current).toEqual(["s", "pa", "pb"]);
  });

  it("history records cannot be modified", () => {
    const runner = AutomatonRunner.replay(ENDS_WITH_AB, ["a"]);
    expect(Object.isFrozen(runner.history[0])).toBe(true);
  });
});
