import type { InputSymbol, StateSet } from "../../automata";
import { DfaTraceTable, NfaTraceTable } from "../simulation/TraceTables";
import type { ComparisonResult } from "./comparisonModel";
import { COMPARISON_CONVERSION, COMPARISON_NFA, dfaStateAlias } from "./comparisonModel";

const setText = (states: StateSet) => (states.length === 0 ? "∅" : `{${states.join(", ")}}`);

interface TracesProps {
  readonly result: ComparisonResult;
  readonly symbolLabel: (symbol: InputSymbol) => string;
}

/** N's trace (shared trace table). */
export function NfaTrace({ result, symbolLabel }: TracesProps) {
  return <NfaTraceTable run={result.nfa} start={COMPARISON_NFA.start} symbolLabel={symbolLabel} />;
}

/** D's trace: each DFA state also shows the set of NFA states it stands for. */
export function DfaTrace({ result, symbolLabel }: TracesProps) {
  return (
    <DfaTraceTable
      run={result.dfa}
      start={COMPARISON_CONVERSION.dfa.start}
      symbolLabel={symbolLabel}
      stateLabel={dfaStateAlias}
      subsetOf={(state) => COMPARISON_CONVERSION.subsets[state]}
    />
  );
}

/** Which set of NFA states each subset-DFA state stands for; the current one is highlighted. */
export function SubsetTable({ current }: { current: string }) {
  const { dfa, subsets } = COMPARISON_CONVERSION;
  return (
    <table className="trace-table subset-table">
      <thead>
        <tr>
          <th>DFA state</th>
          <th>= set of NFA states</th>
          <th>in F?</th>
        </tr>
      </thead>
      <tbody>
        {dfa.states.map((state) => (
          <tr key={state} className={state === current ? "subset-current" : undefined} data-dfa-state={dfaStateAlias(state)}>
            <td>
              {state === dfa.start && "→"}
              {dfaStateAlias(state)}
            </td>
            <td>{setText(subsets[state])}</td>
            <td>{dfa.accepting.includes(state) ? "yes (contains CAPTURE)" : "no"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
