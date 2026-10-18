// NFA → DFA in the Lab, using the engine's subset construction. Pure TypeScript.
import { acceptsDFA, acceptsNFA, nfaToDfa, type Automaton, type InputSymbol, type NFA, type StateSet } from "../../automata";
import type { LabAutomaton } from "./labModel";
import { automatonToLab } from "./labPresets";
import { labToAutomaton, validateLab } from "./labValidation";

export type ConversionResult =
  | { readonly ok: true; readonly lab: LabAutomaton; readonly subsets: Readonly<Record<string, StateSet>> }
  | { readonly ok: false; readonly reason: string };

/** Converts a valid NFA document into a new DFA document (names are the subsets, e.g. "{q0,q1}"). */
export function convertLabToDfa(lab: LabAutomaton): ConversionResult {
  if (lab.kind !== "NFA") return { ok: false, reason: "Only an NFA can be converted (switch the type to NFA)." };
  const issues = validateLab(lab);
  if (issues.length > 0) return { ok: false, reason: `Fix the ${issues.length} problem${issues.length === 1 ? "" : "s"} first.` };
  const { dfa, subsets } = nfaToDfa(labToAutomaton(lab) as NFA);
  return { ok: true, lab: automatonToLab(dfa, `${lab.name} → DFA`), subsets };
}

/** Runs a DFA or an NFA on the engine. */
export function accepts(automaton: Automaton, input: readonly InputSymbol[]): boolean {
  return automaton.kind === "DFA" ? acceptsDFA(automaton, input) : acceptsNFA(automaton, input);
}

export interface EquivalenceReport {
  readonly equivalent: boolean;
  /** How many strings were compared, and up to which length (all strings of each length are tried). */
  readonly tested: number;
  readonly maxLength: number;
  /** A string accepted by exactly one of the two automata, if any. */
  readonly counterexample: readonly InputSymbol[] | null;
}

/**
 * Compares two automata over the same alphabet on every string up to the longest length whose
 * strings all fit within `budget`. Evidence of equivalence, not a proof.
 */
export function checkEquivalence(a: Automaton, b: Automaton, budget = 5000): EquivalenceReport {
  const alphabet = a.alphabet;
  let tested = 0;
  let maxLength = 0;
  let layer: InputSymbol[][] = [[]];
  for (let length = 0; ; length++) {
    if (tested + layer.length > budget && length > 0) break;
    for (const input of layer) {
      tested++;
      if (accepts(a, input) !== accepts(b, input)) return { equivalent: false, tested, maxLength: length, counterexample: input };
    }
    maxLength = length;
    if (alphabet.length === 0) break;
    layer = layer.flatMap((prefix) => alphabet.map((s) => [...prefix, s]));
  }
  return { equivalent: true, tested, maxLength, counterexample: null };
}
