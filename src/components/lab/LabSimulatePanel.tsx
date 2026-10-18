import { useState, type Dispatch } from "react";
import { InputTape } from "../comparison/InputTape";
import type { TapeAction, TapeState } from "../simulation/tapeModel";
import { DfaTraceTable, NfaTraceTable } from "../simulation/TraceTables";
import { pressHandler } from "../visualizer/pressHandler";
import type { LabAutomaton } from "./labModel";
import { parseInputString, type LabRun } from "./labSimulation";
import { labToAutomaton } from "./labValidation";

interface LabSimulatePanelProps {
  readonly lab: LabAutomaton;
  readonly tape: TapeState;
  readonly dispatch: Dispatch<TapeAction>;
  readonly sim: LabRun;
}

/** String simulator: type an input, then Step / Run / Reset; the graph highlights the active state(s). */
export function LabSimulatePanel({ lab, tape, dispatch, sim }: LabSimulatePanelProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const atEnd = tape.position >= tape.input.length;

  const setInput = () => {
    const parsed = parseInputString(text, lab.alphabet);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError(null);
    dispatch({ type: "load", input: parsed.symbols });
  };

  return (
    <div className="lab-sim">
      <div className="lab-row">
        <label className="lab-field-inline">
          input w
          <input
            className="lab-sim-input"
            placeholder={lab.alphabet.every((s) => s.length === 1) ? "e.g. abba (empty = ε)" : "symbols separated by spaces (empty = ε)"}
            value={text}
            aria-invalid={error !== null}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setInput()}
          />
        </label>
        <button type="button" onClick={pressHandler(setInput)}>
          set input
        </button>
        <span className="lab-sep" />
        {lab.alphabet.map((symbol) => (
          <button key={symbol} type="button" title={`append ${symbol}`} onClick={pressHandler(() => dispatch({ type: "append", symbol }))}>
            +{symbol}
          </button>
        ))}
      </div>
      {error && <p className="lab-error-text">{error}</p>}

      <InputTape input={tape.input} position={tape.position} symbolLabel={(s) => s} />
      <div className="lab-row">
        <button type="button" disabled={!sim.runnable || atEnd} title="Read the next symbol" onClick={pressHandler(() => dispatch({ type: "step" }))}>
          Step ▸
        </button>
        <button type="button" disabled={!sim.runnable || atEnd} title="Read the whole remaining input" onClick={pressHandler(() => dispatch({ type: "run" }))}>
          Run ▸▸
        </button>
        <button type="button" title="Back to the start of the input (ε read)" onClick={pressHandler(() => dispatch({ type: "reset" }))}>
          Reset
        </button>
        <button type="button" title="Empty the input" onClick={pressHandler(() => dispatch({ type: "clear" }))}>
          Clear
        </button>
      </div>

      {!sim.runnable ? (
        <p className="lab-error-text" data-testid="sim-status">
          {sim.reason}
        </p>
      ) : (
        <>
          <p className="cmp-status" data-testid="sim-status">
            <span className="cmp-set">
              {sim.kind === "DFA"
                ? `current state: ${sim.run.finalState}`
                : `active set S = ${sim.run.finalStates.length === 0 ? "∅ (every path died)" : `{${sim.run.finalStates.join(", ")}}`}`}
            </span>
            <span className={`verdict ${sim.accepted ? "verdict-accept" : "verdict-reject"}`} data-testid="sim-verdict">
              {atEnd
                ? sim.accepted
                  ? `ACCEPTED: w ∈ L(${lab.kind === "DFA" ? "M" : "N"})`
                  : `REJECTED: w ∉ L(${lab.kind === "DFA" ? "M" : "N"})`
                : `after ${tape.position} of ${tape.input.length}: ${sim.accepted ? "in F" : "not in F"}`}
            </span>
          </p>
          {sim.kind === "DFA" ? (
            <DfaTraceTable run={sim.run} start={labToAutomaton(lab).start} />
          ) : (
            <NfaTraceTable run={sim.run} start={labToAutomaton(lab).start} />
          )}
        </>
      )}
    </div>
  );
}
