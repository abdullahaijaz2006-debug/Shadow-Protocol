import { InvalidAutomatonError, InvalidInputError } from "./errors";
import type { DFA, InputSymbol, State, Transition } from "./types";
import { assertValid, assertValidInput, validateDFA } from "./validate";

/** One step of a DFA run: δ(from, symbol) = to. */
export interface DfaStepRecord {
  /** 1-based position of `symbol` in the input string. */
  readonly step: number;
  readonly from: State;
  readonly symbol: InputSymbol;
  readonly to: State;
}

export interface DfaRunResult {
  /** δ̂(q₀, w) ∈ F */
  readonly accepted: boolean;
  /** δ̂(q₀, w) */
  readonly finalState: State;
  /** One record per input symbol, so trace.length === |w|. */
  readonly trace: readonly DfaStepRecord[];
}

/**
 * A validated DFA with δ compiled from the edge list into a lookup table.
 * Construction throws InvalidAutomatonError if the DFA is invalid (e.g. incomplete).
 */
export class CompiledDFA {
  readonly definition: DFA;
  private readonly table = new Map<State, Map<InputSymbol, State>>();
  private readonly acceptingStates: ReadonlySet<State>;

  constructor(dfa: DFA) {
    assertValid(dfa);
    this.definition = dfa;
    this.acceptingStates = new Set(dfa.accepting);
    for (const state of dfa.states) this.table.set(state, new Map());
    for (const { from, symbol, to } of dfa.transitions) this.table.get(from)!.set(symbol, to);
  }

  get start(): State {
    return this.definition.start;
  }

  /** δ(state, symbol). Throws InvalidInputError if the state is not in Q or the symbol not in Σ. */
  step(state: State, symbol: InputSymbol): State {
    const row = this.table.get(state);
    if (!row) throw new InvalidInputError(`'${state}' is not a state of this DFA`);
    const to = row.get(symbol);
    // δ is total (validated), so a miss can only mean the symbol is outside Σ.
    if (to === undefined) {
      throw new InvalidInputError(`Symbol '${symbol}' is not in Σ = {${this.definition.alphabet.join(", ")}}`);
    }
    return to;
  }

  isAccepting(state: State): boolean {
    return this.acceptingStates.has(state);
  }
}

/** Validates and compiles `dfa`. Compile once when running many inputs (as the runner does). */
export function compileDFA(dfa: DFA): CompiledDFA {
  return new CompiledDFA(dfa);
}

/** One application of the transition function: δ(state, symbol). */
export function dfaStep(dfa: DFA, state: State, symbol: InputSymbol): State {
  return compileDFA(dfa).step(state, symbol);
}

/** Runs `dfa` on the input string `input`, recording every transition. */
export function runDFA(dfa: DFA, input: readonly InputSymbol[]): DfaRunResult {
  const compiled = compileDFA(dfa);
  assertValidInput(dfa, input);

  let state = compiled.start;
  const trace: DfaStepRecord[] = [];
  input.forEach((symbol, index) => {
    const to = compiled.step(state, symbol);
    trace.push({ step: index + 1, from: state, symbol, to });
    state = to;
  });
  return { accepted: compiled.isAccepting(state), finalState: state, trace };
}

/** Is `input` ∈ L(dfa)? */
export function acceptsDFA(dfa: DFA, input: readonly InputSymbol[]): boolean {
  return runDFA(dfa, input).accepted;
}

/**
 * Makes an incomplete DFA complete by sending every undefined δ(q, a) back to q
 * ("ignore this symbol"). Note: this can change the language that is accepted.
 * Throws InvalidAutomatonError for any problem other than missing transitions.
 */
export function completeWithSelfLoops(dfa: DFA): DFA {
  const missing = missingTransitions(dfa);
  const loops = missing.map(({ state, symbol }): Transition => ({ from: state, symbol, to: state }));
  return { ...dfa, transitions: [...dfa.transitions, ...loops] };
}

/**
 * Makes an incomplete DFA complete in the textbook way: every undefined δ(q, a) goes to a new
 * non-accepting trap state that loops to itself on every symbol. The accepted language is
 * unchanged (a missing transition already meant "reject"). If the DFA is already complete it is
 * returned as-is. Throws InvalidAutomatonError for any problem other than missing transitions.
 *
 * @param trapName name for the trap state; primes are appended if it is already used in Q.
 */
export function completeWithTrap(dfa: DFA, trapName: State = "TRAP"): DFA {
  const missing = missingTransitions(dfa);
  if (missing.length === 0) return dfa;

  let trap = trapName;
  while (dfa.states.includes(trap)) trap += "'";

  const toTrap = missing.map(({ state, symbol }): Transition => ({ from: state, symbol, to: trap }));
  const trapLoops = dfa.alphabet.map((symbol): Transition => ({ from: trap, symbol, to: trap }));
  return {
    ...dfa,
    states: [...dfa.states, trap],
    transitions: [...dfa.transitions, ...toTrap, ...trapLoops],
  };
}

/** The (q, a) pairs with no transition, after checking there is no other kind of problem. */
function missingTransitions(dfa: DFA): { state: State; symbol: InputSymbol }[] {
  const issues = validateDFA(dfa);
  const otherIssues = issues.filter((issue) => issue.code !== "MISSING_TRANSITION");
  if (otherIssues.length > 0) throw new InvalidAutomatonError("DFA", otherIssues);
  return issues.map((issue) => ({ state: issue.state!, symbol: issue.symbol! }));
}
