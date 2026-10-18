// State and logic for the NFA ⇄ DFA comparison mode. Pure TypeScript (no React), so it is unit-tested.
// All simulation is done by the Milestone 2 engine (runNFA, runDFA, nfaToDfa); nothing is re-implemented.
import {
  nfaToDfa,
  runDFA,
  runNFA,
  type DfaRunResult,
  type InputSymbol,
  type NFA,
  type NfaRunResult,
  type StateSet,
  type SubsetConstructionResult,
  type Transition,
} from "../../automata";
import type { GuardSymbol } from "../../game/guard/guardDfa";
import { GUARD_NFA } from "../../game/guard/guardNfa";
import { tapeReducer, type TapeAction, type TapeState } from "../simulation/tapeModel";

/** The NFA used in the comparison and its subset-constructed equivalent DFA (computed once). */
export const COMPARISON_NFA: NFA = GUARD_NFA;
export const COMPARISON_CONVERSION: SubsetConstructionResult = nfaToDfa(COMPARISON_NFA);

/** Short display names D0, D1, … for the subset DFA's states, in construction (BFS) order. */
export function dfaStateAlias(state: string): string {
  const index = COMPARISON_CONVERSION.dfa.states.indexOf(state);
  return index < 0 ? state : `D${index}`;
}

// ---------- Input controls (reducer) ----------

/**
 * The comparison's input tape (shared with the Automata Lab's simulator). Both machines always read
 * exactly the same prefix, input[0 .. position).
 */
export type ComparisonState = TapeState;
export type ComparisonAction = TapeAction;
export const comparisonReducer = tapeReducer;

// ---------- Running both machines ----------

export interface ComparisonResult {
  /** The prefix both machines have read. */
  readonly consumed: readonly InputSymbol[];
  readonly nfa: NfaRunResult;
  readonly dfa: DfaRunResult;
  /** The set of NFA states that the DFA's current state stands for. */
  readonly dfaSubset: StateSet;
  /** Subset-construction invariant: the DFA's subset equals the NFA's active set. */
  readonly consistent: boolean;
  /** Edges the NFA followed in the last step (symbol edges and the ε-edges of the closure). */
  readonly nfaLive: readonly Transition[];
  /** The single edge the DFA followed in the last step. */
  readonly dfaLive: readonly Transition[];
}

/** Feeds the same input prefix to the NFA and to its subset-constructed DFA. */
export function compare(
  input: readonly InputSymbol[],
  position: number,
  nfa: NFA = COMPARISON_NFA,
  conversion: SubsetConstructionResult = COMPARISON_CONVERSION,
): ComparisonResult {
  const consumed = input.slice(0, position);
  const nfaRun = runNFA(nfa, consumed);
  const dfaRun = runDFA(conversion.dfa, consumed);
  const dfaSubset = conversion.subsets[dfaRun.finalState];
  const lastNfa = nfaRun.trace[nfaRun.trace.length - 1];
  const lastDfa = dfaRun.trace[dfaRun.trace.length - 1];
  return {
    consumed,
    nfa: nfaRun,
    dfa: dfaRun,
    dfaSubset,
    consistent: sameSet(dfaSubset, nfaRun.finalStates) && dfaRun.accepted === nfaRun.accepted,
    nfaLive: lastNfa ? lastNfa.edges : [],
    dfaLive: lastDfa ? [{ from: lastDfa.from, symbol: lastDfa.symbol, to: lastDfa.to }] : [],
  };
}

function sameSet(a: StateSet, b: StateSet): boolean {
  return a.length === b.length && a.every((state) => b.includes(state));
}

// ---------- Ready-made inputs ----------

export interface Preset {
  readonly id: string;
  readonly label: string;
  readonly input: readonly GuardSymbol[];
  readonly expectAccepted: boolean;
  /** What the example demonstrates. */
  readonly note: string;
}

export const PRESETS: readonly Preset[] = [
  {
    id: "empty",
    label: "ε (empty input)",
    input: [],
    expectAccepted: false,
    note: "Nothing is read: N is in ECLOSE({PATROL}) = {PATROL}, the DFA in its start state D0. PATROL ∉ F, so ε is rejected by both.",
  },
  {
    id: "sound-caught",
    label: "sound · caught",
    input: ["SOUND_HEARD", "PLAYER_CAUGHT"],
    expectAccepted: true,
    note: "The sound opens two paths (ALERT and SEARCH); their ε-closures add CHASE and PATROL. One path, PATROL → ALERT ⇢ε CHASE → CAPTURE, is caught, so the string is accepted.",
  },
  {
    id: "spotted-caught",
    label: "spotted · caught",
    input: ["PLAYER_SPOTTED", "PLAYER_CAUGHT"],
    expectAccepted: true,
    note: "ε-closure after the symbol: reading spotted reaches ALERT, and the ε-edge immediately adds CHASE, which can then be caught.",
  },
  {
    id: "caught",
    label: "caught",
    input: ["PLAYER_CAUGHT"],
    expectAccepted: false,
    note: "δ(PATROL, caught) = ∅: the only path dies. The active set is ∅ (the DFA's trap state), so the string is rejected.",
  },
  {
    id: "sound-timer-timer",
    label: "sound · timer · timer",
    input: ["SOUND_HEARD", "TIMER_EXPIRED", "TIMER_EXPIRED"],
    expectAccepted: false,
    note: "Paths die one by one as timers expire, until only PATROL remains: no path reaches CAPTURE, so it is rejected.",
  },
  {
    id: "spotted-timer-spotted-caught",
    label: "spotted · timer · spotted · caught",
    input: ["PLAYER_SPOTTED", "TIMER_EXPIRED", "PLAYER_SPOTTED", "PLAYER_CAUGHT"],
    expectAccepted: true,
    note: "SEARCH ⇢ε PATROL keeps a patrol path alive alongside the search, and spotting again leads to a capture.",
  },
];

export const INITIAL_COMPARISON: ComparisonState = { input: PRESETS[1].input, position: 0, playing: false };
