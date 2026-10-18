import { InvalidInputError } from "./errors";
import { EPSILON, type InputSymbol, type NFA, type State, type StateSet, type Transition, type TransitionRecord } from "./types";
import { assertValid, assertValidInput } from "./validate";

/** One step of an NFA run: to = ECLOSE(moved), where moved = ⋃ δ(q, symbol) for q ∈ from. */
export interface NfaStepRecord extends TransitionRecord {
  /** States reached by the symbol edges, before taking ε-closure. */
  readonly moved: StateSet;
}

export interface NfaRunResult {
  /** δ̂(q₀, w) ∩ F ≠ ∅ */
  readonly accepted: boolean;
  /** ECLOSE({q₀}): the configuration before reading any input. */
  readonly initialStates: StateSet;
  /** δ̂(q₀, w): the configuration after reading all of the input. Empty if every branch died. */
  readonly finalStates: StateSet;
  /** One record per input symbol, so trace.length === |w|. */
  readonly trace: readonly NfaStepRecord[];
}

interface Closure {
  readonly states: StateSet;
  /** The ε-edges followed to build the closure. */
  readonly edges: readonly Transition[];
}

/**
 * A validated NFA with δ compiled from the edge list into a lookup table.
 * Construction throws InvalidAutomatonError if the NFA is invalid.
 */
export class CompiledNFA {
  readonly definition: NFA;
  /** Position of each state in Q, used to put state sets into canonical order. */
  private readonly order = new Map<State, number>();
  /** table[q][a] = every edge (q, a, _), including a = EPSILON. */
  private readonly table = new Map<State, Map<InputSymbol, Transition[]>>();
  private readonly alphabet: ReadonlySet<InputSymbol>;
  private readonly acceptingStates: ReadonlySet<State>;

  constructor(nfa: NFA) {
    assertValid(nfa);
    this.definition = nfa;
    this.alphabet = new Set(nfa.alphabet);
    this.acceptingStates = new Set(nfa.accepting);
    nfa.states.forEach((state, index) => {
      this.order.set(state, index);
      this.table.set(state, new Map());
    });
    for (const edge of nfa.transitions) {
      const bySymbol = this.table.get(edge.from)!;
      bySymbol.set(edge.symbol, [...(bySymbol.get(edge.symbol) ?? []), edge]);
    }
  }

  /** ECLOSE({q₀}) */
  get start(): Closure {
    return this.closure([this.definition.start]);
  }

  /** Removes duplicates and orders the states as they are declared in Q. */
  canonical(states: Iterable<State>): StateSet {
    const unique = new Set(states);
    for (const state of unique) {
      if (!this.order.has(state)) throw new InvalidInputError(`'${state}' is not a state of this NFA`);
    }
    return [...unique].sort((a, b) => this.order.get(a)! - this.order.get(b)!);
  }

  /**
   * ECLOSE(states): every state reachable from `states` using only ε-edges (zero or more).
   * Depth-first search with a visited set, so ε-cycles terminate.
   */
  closure(states: Iterable<State>): Closure {
    const stack = [...this.canonical(states)];
    const visited = new Set(stack);
    const edges: Transition[] = [];
    while (stack.length > 0) {
      const state = stack.pop()!;
      for (const edge of this.edgesFrom(state, EPSILON)) {
        edges.push(edge);
        if (!visited.has(edge.to)) {
          visited.add(edge.to);
          stack.push(edge.to);
        }
      }
    }
    return { states: this.canonical(visited), edges };
  }

  /**
   * One step from an (already ε-closed) configuration: ECLOSE(⋃ δ(q, symbol)) for q ∈ from.
   * Throws InvalidInputError if the symbol is not in Σ.
   */
  step(from: StateSet, symbol: InputSymbol): Omit<NfaStepRecord, "step"> {
    if (!this.alphabet.has(symbol)) {
      throw new InvalidInputError(`Symbol '${symbol}' is not in Σ = {${this.definition.alphabet.join(", ")}}`);
    }
    const symbolEdges = this.canonical(from).flatMap((state) => this.edgesFrom(state, symbol));
    const moved = this.canonical(symbolEdges.map((edge) => edge.to));
    const closure = this.closure(moved);
    return { from, symbol, moved, to: closure.states, edges: [...symbolEdges, ...closure.edges] };
  }

  /** S ∩ F ≠ ∅ */
  isAccepting(states: StateSet): boolean {
    return states.some((state) => this.acceptingStates.has(state));
  }

  private edgesFrom(state: State, symbol: InputSymbol): readonly Transition[] {
    return this.table.get(state)?.get(symbol) ?? [];
  }
}

/** Validates and compiles `nfa`. Compile once when running many inputs (as the runner does). */
export function compileNFA(nfa: NFA): CompiledNFA {
  return new CompiledNFA(nfa);
}

/** ECLOSE(states), in canonical order. */
export function epsilonClosure(nfa: NFA, states: Iterable<State>): StateSet {
  return compileNFA(nfa).closure(states).states;
}

/** One step from an ε-closed configuration `states`: ECLOSE(⋃ δ(q, symbol)). */
export function nfaStep(nfa: NFA, states: StateSet, symbol: InputSymbol): StateSet {
  return compileNFA(nfa).step(states, symbol).to;
}

/** Runs `nfa` on `input`, tracking the set of all states the NFA could be in. */
export function runNFA(nfa: NFA, input: readonly InputSymbol[]): NfaRunResult {
  const compiled = compileNFA(nfa);
  assertValidInput(nfa, input);

  const initialStates = compiled.start.states;
  let states = initialStates;
  const trace: NfaStepRecord[] = [];
  input.forEach((symbol, index) => {
    const record = { step: index + 1, ...compiled.step(states, symbol) };
    trace.push(record);
    states = record.to;
  });
  return { accepted: compiled.isAccepting(states), initialStates, finalStates: states, trace };
}

/** Is `input` ∈ L(nfa)? */
export function acceptsNFA(nfa: NFA, input: readonly InputSymbol[]): boolean {
  return runNFA(nfa, input).accepted;
}
