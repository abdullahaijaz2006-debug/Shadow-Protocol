// Running input strings on the Lab's automaton. All simulation is the engine's (runDFA / runNFA).
// Pure TypeScript.
import {
  EPSILON,
  runDFA,
  runNFA,
  type DFA,
  type DfaRunResult,
  type InputSymbol,
  type NFA,
  type NfaRunResult,
  type Transition,
} from "../../automata";
import type { LabAutomaton, StateId } from "./labModel";
import { labToAutomaton, validateLab } from "./labValidation";

export type InputParse = { readonly ok: true; readonly symbols: readonly InputSymbol[] } | { readonly ok: false; readonly error: string };

/**
 * Turns typed text into an input string over Σ:
 *  - empty text is the empty string ε;
 *  - text with spaces or commas is split on them ("PLAYER_SPOTTED TIMER_EXPIRED");
 *  - otherwise, if every symbol of Σ is a single character, each character is a symbol ("abba");
 *  - otherwise the whole text is one symbol.
 */
export function parseInputString(text: string, alphabet: readonly string[]): InputParse {
  const trimmed = text.trim();
  if (trimmed === "" || trimmed === EPSILON) return { ok: true, symbols: [] };
  const symbols = /[\s,]/.test(trimmed)
    ? trimmed.split(/[\s,]+/).filter(Boolean)
    : alphabet.length > 0 && alphabet.every((s) => [...s].length === 1)
      ? [...trimmed]
      : [trimmed];
  const unknown = [...new Set(symbols.filter((s) => !alphabet.includes(s)))];
  if (unknown.length > 0) {
    return { ok: false, error: `Not in Σ: ${unknown.map((s) => `"${s}"`).join(", ")}. Σ = {${alphabet.join(", ")}}.` };
  }
  return { ok: true, symbols };
}

/** A transition taken in the last step, in state *ids* (for highlighting the Lab graph). */
export interface LiveEdge {
  readonly from: StateId;
  readonly symbol: InputSymbol;
  readonly to: StateId;
}

export type LabRun =
  | { readonly runnable: false; readonly reason: string }
  | {
      readonly runnable: true;
      readonly kind: "DFA";
      readonly run: DfaRunResult;
      readonly accepted: boolean;
      /** The current state, as an id. */
      readonly current: readonly StateId[];
      readonly live: readonly LiveEdge[];
    }
  | {
      readonly runnable: true;
      readonly kind: "NFA";
      readonly run: NfaRunResult;
      readonly accepted: boolean;
      /** The set of active states, as ids. */
      readonly current: readonly StateId[];
      readonly live: readonly LiveEdge[];
    };

/**
 * Reads input[0 .. position) with the engine. Only a valid automaton can be run (the engine
 * itself refuses invalid ones), so the reason is reported instead.
 */
export function simulateLab(lab: LabAutomaton, input: readonly InputSymbol[], position: number): LabRun {
  const issues = validateLab(lab);
  if (issues.length > 0) {
    return { runnable: false, reason: `Fix the ${issues.length} problem${issues.length === 1 ? "" : "s"} listed under Problems before simulating.` };
  }
  const unknown = input.filter((s) => !lab.alphabet.includes(s));
  if (unknown.length > 0) return { runnable: false, reason: `The input uses "${unknown[0]}", which is no longer in Σ.` };

  // A valid automaton has unique state names, so names map back to ids one-to-one.
  const idOf = new Map(lab.states.map((s) => [s.name, s.id]));
  const ids = (names: readonly string[]) => names.map((n) => idOf.get(n)!);
  const edges = (list: readonly Transition[]) => list.map((t) => ({ from: idOf.get(t.from)!, symbol: t.symbol, to: idOf.get(t.to)! }));
  const prefix = input.slice(0, position);
  const automaton = labToAutomaton(lab);

  if (automaton.kind === "DFA") {
    const run = runDFA(automaton as DFA, prefix);
    const last = run.trace[run.trace.length - 1];
    return {
      runnable: true,
      kind: "DFA",
      run,
      accepted: run.accepted,
      current: ids([run.finalState]),
      live: last ? edges([{ from: last.from, symbol: last.symbol, to: last.to }]) : [],
    };
  }
  const run = runNFA(automaton as NFA, prefix);
  const last = run.trace[run.trace.length - 1];
  return {
    runnable: true,
    kind: "NFA",
    run,
    accepted: run.accepted,
    current: ids(run.finalStates),
    live: last ? edges(last.edges) : [],
  };
}
