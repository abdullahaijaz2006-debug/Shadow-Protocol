// Pure TypeScript: no Phaser, React or Tauri imports. See CLAUDE.md.

/** A state name, e.g. "q0" or "PATROL". */
export type State = string;

/** One input symbol, e.g. "a" or "PLAYER_SPOTTED". Input strings are arrays of these. */
export type InputSymbol = string;

/** The empty string ε. Only allowed as a transition label in an NFA, never in Σ. */
export const EPSILON = "ε";

/** One edge of δ: the triple (from, symbol, to). */
export interface Transition {
  readonly from: State;
  readonly symbol: InputSymbol;
  readonly to: State;
}

/** Fields shared by DFAs and NFAs: the 5-tuple (Q, Σ, δ, q₀, F). */
interface FiveTuple {
  /** Q */
  readonly states: readonly State[];
  /** Σ */
  readonly alphabet: readonly InputSymbol[];
  /** δ, as a list of edges (the canonical representation). */
  readonly transitions: readonly Transition[];
  /** q₀ */
  readonly start: State;
  /** F */
  readonly accepting: readonly State[];
}

/**
 * Deterministic finite automaton. δ : Q × Σ → Q must be total:
 * exactly one edge for every (state, symbol) pair.
 */
export interface DFA extends FiveTuple {
  readonly kind: "DFA";
}

/**
 * Nondeterministic finite automaton. δ : Q × (Σ ∪ {ε}) → 𝒫(Q):
 * any number of edges per (state, symbol), and edges may be labelled EPSILON.
 */
export interface NFA extends FiveTuple {
  readonly kind: "NFA";
}

export type Automaton = DFA | NFA;

/**
 * A set of states in canonical form: no duplicates, ordered as the states are declared in Q.
 * Plain arrays (not Set) so traces can be compared in tests and serialized for the UI.
 */
export type StateSet = readonly State[];

/** One step of a simulation, in a shape shared by DFAs and NFAs (used by the runner's history). */
export interface TransitionRecord {
  /** 1-based position of `symbol` in the input string. */
  readonly step: number;
  readonly from: StateSet;
  readonly symbol: InputSymbol;
  readonly to: StateSet;
  /** Every edge that fired in this step, including ε-edges followed during closure. */
  readonly edges: readonly Transition[];
}
