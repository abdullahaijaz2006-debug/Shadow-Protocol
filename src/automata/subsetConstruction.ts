import { compileNFA } from "./nfa";
import type { DFA, NFA, State, StateSet, Transition } from "./types";

export interface SubsetConstructionResult {
  /** A complete DFA with L(dfa) = L(nfa). */
  readonly dfa: DFA;
  /** Each DFA state's name → the set of NFA states it stands for. */
  readonly subsets: Readonly<Record<State, StateSet>>;
}

/** State names that can appear unquoted inside a subset name: no separators, braces, quotes or ∅. */
const PLAIN_STATE_NAME = /^[^,{}"\\∅]+$/;

/**
 * DFA state name for a set of NFA states, e.g. "{q0,q2}", or "∅" for the empty set.
 *
 * Names that could be ambiguous (containing `,` `{` `}` `"` `\` or `∅`, or empty) are written as
 * JSON strings, e.g. ["a,b"] → `{"a,b"}` but ["a", "b"] → `{a,b}`. This makes the naming
 * injective: different sets (in the same order) always get different names.
 */
export function subsetName(states: StateSet): State {
  if (states.length === 0) return "∅";
  const parts = states.map((state) => (PLAIN_STATE_NAME.test(state) ? state : JSON.stringify(state)));
  return `{${parts.join(",")}}`;
}

/**
 * Subset (powerset) construction. Each DFA state is a set S of NFA states:
 *   start  = ECLOSE({q₀})
 *   δ(S, a) = ECLOSE(⋃_{q ∈ S} δ_N(q, a))
 *   F      = { S | S ∩ F_N ≠ ∅ }
 * Only subsets reachable from the start are built (breadth-first worklist), so the result usually
 * has far fewer than 2^|Q| states. The empty set becomes a trap state "∅", keeping δ total.
 * Throws InvalidAutomatonError if the NFA is invalid.
 */
export function nfaToDfa(nfa: NFA): SubsetConstructionResult {
  const compiled = compileNFA(nfa);

  // A subset's identity is the list of its states' positions in Q, e.g. "0,2". Positions are
  // numbers, so this key is unambiguous whatever characters the state names contain.
  const position = new Map(nfa.states.map((state, index) => [state, index] as const));
  const keyOf = (states: StateSet) => states.map((state) => position.get(state)).join(",");

  const found = new Map<string, { name: State; states: StateSet }>();
  const usedNames = new Set<State>();
  const worklist: StateSet[] = [];

  /** Registers a subset (if new) and returns its DFA state name. */
  const visit = (states: StateSet): State => {
    const key = keyOf(states);
    const existing = found.get(key);
    if (existing) return existing.name;

    const name = subsetName(states);
    // subsetName is injective, so this cannot happen; checked so a bug fails loudly.
    if (usedNames.has(name)) throw new Error(`Subset construction produced the name '${name}' twice`);
    usedNames.add(name);
    found.set(key, { name, states });
    worklist.push(states);
    return name;
  };

  const start = visit(compiled.start.states);
  const transitions: Transition[] = [];
  while (worklist.length > 0) {
    const from = worklist.shift()!;
    const fromName = found.get(keyOf(from))!.name;
    for (const symbol of nfa.alphabet) {
      transitions.push({ from: fromName, symbol, to: visit(compiled.step(from, symbol).to) });
    }
  }

  const entries = [...found.values()];
  return {
    dfa: {
      kind: "DFA",
      states: entries.map((entry) => entry.name),
      alphabet: [...nfa.alphabet],
      transitions,
      start,
      accepting: entries.filter((entry) => compiled.isAccepting(entry.states)).map((entry) => entry.name),
    },
    subsets: Object.fromEntries(entries.map((entry) => [entry.name, entry.states])),
  };
}
