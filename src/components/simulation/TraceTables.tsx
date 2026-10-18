import type { DfaRunResult, InputSymbol, NfaRunResult, State, StateSet } from "../../automata";

const setText = (states: StateSet, label: (s: State) => string = (s) => s) =>
  states.length === 0 ? "∅" : `{${states.map(label).join(", ")}}`;

/** A state set where states added only by the ε-closure are marked. */
function ClosureSet({ moved, closure }: { moved: StateSet; closure: StateSet }) {
  if (closure.length === 0) return <span className="trace-dead">∅</span>;
  return (
    <span>
      {"{"}
      {closure.map((state, index) => (
        <span key={state}>
          {index > 0 && ", "}
          <span className={moved.includes(state) ? undefined : "trace-eps-added"} title={moved.includes(state) ? undefined : "added by ε-closure"}>
            {state}
          </span>
        </span>
      ))}
      {"}"}
    </span>
  );
}

interface NfaTraceProps {
  readonly run: NfaRunResult;
  /** q₀, shown as the starting point of the closure. */
  readonly start: State;
  readonly symbolLabel?: (symbol: InputSymbol) => string;
}

/** NFA trace: each step reads a symbol, moves every active state, then takes the ε-closure. */
export function NfaTraceTable({ run, start, symbolLabel = (s) => s }: NfaTraceProps) {
  return (
    <table className="trace-table">
      <thead>
        <tr>
          <th>#</th>
          <th>read</th>
          <th>from S</th>
          <th>move(S, a)</th>
          <th>ECLOSE → active set</th>
        </tr>
      </thead>
      <tbody>
        <tr className="trace-start">
          <td>0</td>
          <td>—</td>
          <td colSpan={2}>start: ECLOSE({"{"}q₀{"}"})</td>
          <td>
            <ClosureSet moved={[start]} closure={run.initialStates} />
          </td>
        </tr>
        {run.trace.map((step) => (
          <tr key={step.step} className={step.step === run.trace.length ? "trace-latest" : undefined}>
            <td>{step.step}</td>
            <td className="trace-symbol">{symbolLabel(step.symbol)}</td>
            <td>{setText(step.from)}</td>
            <td>{setText(step.moved)}</td>
            <td>
              <ClosureSet moved={step.moved} closure={step.to} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface DfaTraceProps {
  readonly run: DfaRunResult;
  readonly start: State;
  readonly symbolLabel?: (symbol: InputSymbol) => string;
  /** Display name for a state (e.g. "D2" for a subset-construction state). */
  readonly stateLabel?: (state: State) => string;
  /** For a subset-construction DFA: the set of NFA states each state stands for (adds a column). */
  readonly subsetOf?: (state: State) => StateSet;
}

/** DFA trace: exactly one transition per symbol. */
export function DfaTraceTable({ run, start, symbolLabel = (s) => s, stateLabel = (s) => s, subsetOf }: DfaTraceProps) {
  return (
    <table className="trace-table">
      <thead>
        <tr>
          <th>#</th>
          <th>read</th>
          <th>δ(from, a) = to</th>
          {subsetOf && <th>to stands for</th>}
        </tr>
      </thead>
      <tbody>
        <tr className="trace-start">
          <td>0</td>
          <td>—</td>
          <td>start: {stateLabel(start)}</td>
          {subsetOf && <td>{setText(subsetOf(start))}</td>}
        </tr>
        {run.trace.map((step) => (
          <tr key={step.step} className={step.step === run.trace.length ? "trace-latest" : undefined}>
            <td>{step.step}</td>
            <td className="trace-symbol">{symbolLabel(step.symbol)}</td>
            <td>
              {stateLabel(step.from)} → {stateLabel(step.to)}
            </td>
            {subsetOf && <td className={subsetOf(step.to).length === 0 ? "trace-dead" : undefined}>{setText(subsetOf(step.to))}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
