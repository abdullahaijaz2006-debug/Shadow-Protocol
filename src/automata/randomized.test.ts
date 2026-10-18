import { describe, expect, it } from "vitest";
import { runDFA } from "./dfa";
import { epsilonClosure, runNFA } from "./nfa";
import { AutomatonRunner } from "./runner";
import { nfaToDfa } from "./subsetConstruction";
import { allStrings } from "./testHelpers";
import { EPSILON, type InputSymbol, type NFA, type State, type Transition } from "./types";
import { validateDFA } from "./validate";

/**
 * Differential tests on many random ε-NFAs (seeded, so every run checks the same machines).
 * The engine is compared with a brute-force path search written independently of it, and the
 * subset construction is compared with the NFA it came from.
 */

/** mulberry32: a small deterministic PRNG. */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random valid NFA: 1–5 states, |Σ| 0–2, ε-edges (cycles and self-loops allowed), any F. */
function randomNfa(rand: () => number): NFA {
  const n = 1 + Math.floor(rand() * 5);
  const states = Array.from({ length: n }, (_, i) => `q${i}`);
  const alphabet = ["a", "b"].slice(0, Math.floor(rand() * 3));
  const transitions: Transition[] = [];
  for (const from of states) {
    for (const symbol of [...alphabet, EPSILON]) {
      for (const to of states) {
        if (rand() < (symbol === EPSILON ? 0.18 : 0.3)) transitions.push({ from, symbol, to });
      }
    }
  }
  return {
    kind: "NFA",
    states,
    alphabet,
    transitions,
    start: states[Math.floor(rand() * n)],
    accepting: states.filter(() => rand() < 0.35),
  };
}

/**
 * Reference semantics, independent of the engine: every state some computation path can be in
 * after reading all of `input` (a path may take ε-edges anywhere). The visited set on
 * (state, position) is what makes ε-cycles terminate.
 */
function reachableAtEnd(nfa: NFA, input: readonly InputSymbol[]): Set<State> {
  const visited = new Set<string>();
  const atEnd = new Set<State>();
  const stack: [State, number][] = [[nfa.start, 0]];
  while (stack.length > 0) {
    const [state, position] = stack.pop()!;
    const key = `${state}@${position}`;
    if (visited.has(key)) continue;
    visited.add(key);
    if (position === input.length) atEnd.add(state);
    for (const t of nfa.transitions) {
      if (t.from !== state) continue;
      if (t.symbol === EPSILON) stack.push([t.to, position]);
      else if (position < input.length && t.symbol === input[position]) stack.push([t.to, position + 1]);
    }
  }
  return atEnd;
}

const sorted = (states: Iterable<State>) => [...states].sort();
const MACHINES = 250;
const MAX_LENGTH = 6;

function* machines(): Generator<NFA> {
  const rand = random(20260518);
  for (let i = 0; i < MACHINES; i++) yield randomNfa(rand);
}

describe("random ε-NFAs (differential)", () => {
  it("runNFA's final set and verdict equal a brute-force search over all computation paths", () => {
    for (const nfa of machines()) {
      for (const word of allStrings(nfa.alphabet, MAX_LENGTH)) {
        const expected = reachableAtEnd(nfa, word);
        const run = runNFA(nfa, word);
        expect(sorted(run.finalStates), `${JSON.stringify(nfa)} on "${word.join("")}"`).toEqual(sorted(expected));
        expect(run.accepted).toBe(nfa.accepting.some((q) => expected.has(q)));
      }
    }
  });

  it("the empty string is accepted iff ECLOSE({q₀}) meets F", () => {
    for (const nfa of machines()) {
      const closure = epsilonClosure(nfa, [nfa.start]);
      expect(sorted(closure)).toEqual(sorted(reachableAtEnd(nfa, [])));
      expect(runNFA(nfa, []).accepted).toBe(closure.some((q) => nfa.accepting.includes(q)));
    }
  });

  it("traces record exactly the consumed symbols, in order, chaining from → to", () => {
    for (const nfa of machines()) {
      for (const word of allStrings(nfa.alphabet, 4)) {
        const run = runNFA(nfa, word);
        expect(run.trace.map((r) => r.symbol)).toEqual(word);
        expect(run.trace.map((r) => r.step)).toEqual(word.map((_, i) => i + 1));
        let current = run.initialStates;
        for (const record of run.trace) {
          expect(record.from).toEqual(current);
          current = record.to;
        }
        expect(current).toEqual(run.finalStates);
      }
    }
  });

  it("nfaToDfa gives a valid DFA with the same language, and each DFA state is the NFA's active set", () => {
    for (const nfa of machines()) {
      const { dfa, subsets } = nfaToDfa(nfa);
      expect(validateDFA(dfa)).toEqual([]);
      for (const word of allStrings(nfa.alphabet, MAX_LENGTH)) {
        const nfaRun = runNFA(nfa, word);
        const dfaRun = runDFA(dfa, word);
        expect(dfaRun.accepted, `${JSON.stringify(nfa)} on "${word.join("")}"`).toBe(nfaRun.accepted);
        expect(subsets[dfaRun.finalState]).toEqual(nfaRun.finalStates);
        expect(dfaRun.trace.map((r) => r.symbol)).toEqual(word);
      }
    }
  });

  it("AutomatonRunner fed one symbol at a time agrees with runNFA", () => {
    for (const nfa of machines()) {
      for (const word of allStrings(nfa.alphabet, 3)) {
        const runner = new AutomatonRunner(nfa);
        for (const symbol of word) runner.feed(symbol);
        expect(runner.current).toEqual(runNFA(nfa, word).finalStates);
        expect(runner.history.length).toBe(word.length);
      }
    }
  });

  it("covers the edge cases it is meant to (ε-cycles, empty Σ, empty F, dead branches)", () => {
    const all = [...machines()];
    const hasEpsilonCycle = (nfa: NFA) =>
      nfa.states.some((q) => {
        const next = nfa.transitions.filter((t) => t.symbol === EPSILON && t.from === q).map((t) => t.to);
        return next.some((r) => r === q || epsilonClosure(nfa, [r]).includes(q));
      });
    expect(all.filter(hasEpsilonCycle).length).toBeGreaterThan(20);
    expect(all.filter((nfa) => nfa.alphabet.length === 0).length).toBeGreaterThan(20);
    expect(all.filter((nfa) => nfa.accepting.length === 0).length).toBeGreaterThan(5);
    expect(all.filter((nfa) => nfaToDfa(nfa).dfa.states.includes("∅")).length).toBeGreaterThan(20);
  });
});
