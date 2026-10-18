// The subset construction, explained one row at a time. Pure TypeScript.
//
// Nothing is re-implemented: the result is the engine's nfaToDfa, and each row's "move, then
// ε-closure" is the engine's own CompiledNFA.step. This module only puts them in the order the
// construction discovers subsets, so the tutorial can reveal them step by step.
import {
  compileNFA,
  nfaToDfa,
  subsetName,
  type InputSymbol,
  type NFA,
  type State,
  type StateSet,
  type SubsetConstructionResult,
} from "../../automata";

export interface SubsetStep {
  /** The DFA state (a set of NFA states) whose transition this row computes. */
  readonly fromName: State;
  readonly from: StateSet;
  readonly symbol: InputSymbol;
  /** ⋃ δ(q, symbol) for q ∈ from. */
  readonly moved: StateSet;
  /** ECLOSE(moved): the target DFA state. */
  readonly to: StateSet;
  readonly toName: State;
  /** True when this row discovers a subset no earlier row produced (it joins the worklist). */
  readonly isNew: boolean;
  /** DFA states known after this row, in discovery order. */
  readonly discovered: readonly State[];
}

export interface SubsetWalkthrough {
  readonly start: { readonly name: State; readonly closure: StateSet };
  readonly steps: readonly SubsetStep[];
  readonly result: SubsetConstructionResult;
}

export function subsetConstructionSteps(nfa: NFA): SubsetWalkthrough {
  const result = nfaToDfa(nfa);
  const compiled = compileNFA(nfa);
  const startSet = compiled.start.states;
  const discovered: State[] = [subsetName(startSet)];
  const steps: SubsetStep[] = [];
  // nfaToDfa processes its worklist in discovery order, which is the order of result.dfa.states.
  for (const fromName of result.dfa.states) {
    const from = result.subsets[fromName];
    for (const symbol of nfa.alphabet) {
      const { moved, to } = compiled.step(from, symbol);
      const toName = subsetName(to);
      const isNew = !discovered.includes(toName);
      if (isNew) discovered.push(toName);
      steps.push({ fromName, from, symbol, moved, to, toName, isNew, discovered: [...discovered] });
    }
  }
  return { start: { name: subsetName(startSet), closure: startSet }, steps, result };
}
