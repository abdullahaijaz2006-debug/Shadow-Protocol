import { compileDFA } from "./dfa";
import { compileNFA } from "./nfa";
import type { Automaton, InputSymbol, StateSet, Transition, TransitionRecord } from "./types";
import { assertValidInput } from "./validate";

/** The common shape of a compiled DFA or NFA, seen as working on sets of states. */
interface Machine {
  readonly initial: StateSet;
  step(from: StateSet, symbol: InputSymbol): { to: StateSet; edges: readonly Transition[] };
  isAccepting(states: StateSet): boolean;
}

function toMachine(automaton: Automaton): Machine {
  if (automaton.kind === "DFA") {
    const dfa = compileDFA(automaton);
    return {
      initial: [dfa.start],
      step: ([from], symbol) => {
        const to = dfa.step(from, symbol);
        return { to: [to], edges: [{ from, symbol, to }] };
      },
      isAccepting: ([state]) => dfa.isAccepting(state),
    };
  }
  const nfa = compileNFA(automaton);
  return {
    initial: nfa.start.states,
    step: (from, symbol) => nfa.step(from, symbol),
    isAccepting: (states) => nfa.isAccepting(states),
  };
}

/**
 * Feeds symbols to a DFA or NFA one at a time, keeping the current configuration and a history
 * of every transition. This is what a guard will hold: game events go in through `feed`.
 *
 * The configuration is always a StateSet; for a DFA it holds exactly one state.
 * Runs are deterministic: the same automaton and input always produce the same history,
 * so `AutomatonRunner.replay(automaton, runner.input)` reproduces a run exactly.
 */
export class AutomatonRunner {
  readonly automaton: Automaton;
  private readonly machine: Machine;
  private currentStates: StateSet;
  private readonly records: TransitionRecord[] = [];
  private readonly symbols: InputSymbol[] = [];

  /** Throws InvalidAutomatonError if `automaton` is invalid. */
  constructor(automaton: Automaton) {
    this.automaton = automaton;
    this.machine = toMachine(automaton);
    this.currentStates = this.machine.initial;
  }

  /** Runs `input` on a fresh runner. Its history equals that of any earlier run on the same input. */
  static replay(automaton: Automaton, input: readonly InputSymbol[]): AutomatonRunner {
    const runner = new AutomatonRunner(automaton);
    runner.feedAll(input);
    return runner;
  }

  /** The current configuration: [q] for a DFA, the set of active states for an NFA. */
  get current(): StateSet {
    return this.currentStates;
  }

  /** Is the input fed so far in L(automaton)? */
  get isAccepting(): boolean {
    return this.machine.isAccepting(this.currentStates);
  }

  /** Every transition taken since the last reset, oldest first. */
  get history(): readonly TransitionRecord[] {
    return this.records;
  }

  /** The input string fed since the last reset. */
  get input(): readonly InputSymbol[] {
    return this.symbols;
  }

  /**
   * Reads one symbol and records the transition. Throws InvalidInputError if the symbol is not
   * in Σ, in which case nothing changes.
   */
  feed(symbol: InputSymbol): TransitionRecord {
    const { to, edges } = this.machine.step(this.currentStates, symbol);
    const record: TransitionRecord = Object.freeze({
      step: this.records.length + 1,
      from: this.currentStates,
      symbol,
      to,
      edges,
    });
    this.records.push(record);
    this.symbols.push(symbol);
    this.currentStates = to;
    return record;
  }

  /** Feeds a whole input string. All symbols are checked first, so an invalid string changes nothing. */
  feedAll(input: readonly InputSymbol[]): readonly TransitionRecord[] {
    assertValidInput(this.automaton, input);
    return input.map((symbol) => this.feed(symbol));
  }

  /** Back to the initial configuration with an empty history. */
  reset(): void {
    this.currentStates = this.machine.initial;
    this.records.length = 0;
    this.symbols.length = 0;
  }
}
