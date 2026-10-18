import type { StateSet } from "../../automata";
import { pressHandler } from "../visualizer/pressHandler";
import type { EquivalenceReport } from "./labConversion";
import type { LabAutomaton } from "./labModel";

/** The result of the last conversion, kept so the user can return to the NFA. */
export interface ConversionRecord {
  readonly nfa: LabAutomaton;
  readonly subsets: Readonly<Record<string, StateSet>>;
  readonly report: EquivalenceReport;
}

interface LabConvertPanelProps {
  readonly lab: LabAutomaton;
  /** Why conversion is not possible right now, if it isn't. */
  readonly blockedReason: string | null;
  readonly conversion: ConversionRecord | null;
  readonly onConvert: () => void;
  readonly onBackToNfa: () => void;
}

const setText = (states: StateSet) => (states.length === 0 ? "∅" : `{${states.join(", ")}}`);

/** NFA → DFA with the engine's subset construction, plus an equivalence check. */
export function LabConvertPanel({ lab, blockedReason, conversion, onConvert, onBackToNfa }: LabConvertPanelProps) {
  return (
    <div className="lab-convert">
      <p className="cmp-explain">
        <strong>Subset construction:</strong> each DFA state is a set S of NFA states. The start is ECLOSE({"{"}q₀{"}"}), δ(S, a) =
        ECLOSE(⋃ δ(q, a) for q ∈ S), and S is accepting if it contains an accepting NFA state. Only reachable subsets are built;
        ∅ becomes a trap state.
      </p>
      {lab.kind === "NFA" && (
        <div className="lab-row">
          <button type="button" disabled={blockedReason !== null} onClick={pressHandler(onConvert)}>
            Convert to DFA (subset construction)
          </button>
          {blockedReason && <span className="lab-error-text">{blockedReason}</span>}
        </div>
      )}
      {lab.kind === "DFA" && !conversion && (
        <p className="formal-dim">This is a DFA. Switch the type to NFA, or load an NFA preset, to convert one.</p>
      )}
      {conversion && (
        <div data-testid="conversion">
          <p>
            Built from the NFA <strong>“{conversion.nfa.name}”</strong> ({conversion.nfa.states.length} states →{" "}
            {Object.keys(conversion.subsets).length} DFA states).{" "}
            <button type="button" onClick={pressHandler(onBackToNfa)}>
              ← back to the NFA
            </button>
          </p>
          <p className={conversion.report.equivalent ? "cmp-agree-ok" : "cmp-agree-bad"} data-testid="equivalence">
            {conversion.report.equivalent
              ? `✓ Both accept exactly the same strings among all ${conversion.report.tested} strings of length ≤ ${conversion.report.maxLength} (a check; equal languages are guaranteed by the subset construction theorem).`
              : `✗ Differ on "${conversion.report.counterexample?.join(" ") || "ε"}".`}
          </p>
          <table className="trace-table subset-table">
            <thead>
              <tr>
                <th>DFA state</th>
                <th>= set of NFA states</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(conversion.subsets).map(([name, subset]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{setText(subset)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
