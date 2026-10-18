// Interactive diagrams for the tutorial. They only display results computed by the automata
// engine (runDFA, runNFA, epsilonClosure, the comparison model, the subset walkthrough).
import { useMemo, useReducer, useState } from "react";
import { epsilonClosure, runDFA, runNFA, type DFA, type NFA, type State, type Transition } from "../../automata";
import { NFA_GRAPH_LAYOUT, NFA_GRAPH_VIEWBOX, SUBSET_GRAPH_LAYOUT, SUBSET_GRAPH_VIEWBOX, TRAP_STATE } from "../comparison/comparisonLayouts";
import { compare, dfaStateAlias, COMPARISON_CONVERSION, COMPARISON_NFA, PRESETS } from "../comparison/comparisonModel";
import { InputTape } from "../comparison/InputTape";
import { checkEquivalence } from "../lab/labConversion";
import { tapeReducer } from "../simulation/tapeModel";
import { DfaTraceTable, NfaTraceTable } from "../simulation/TraceTables";
import { AutomatonGraph } from "../visualizer/AutomatonGraph";
import { FormalDefinition } from "../visualizer/FormalDefinition";
import { ellipseLayout } from "../visualizer/graphLayout";
import { pressHandler } from "../visualizer/pressHandler";
import type { StepperExample } from "./content/types";
import { MACHINES, type MachineId } from "./machines";
import { subsetConstructionSteps } from "./subsetSteps";

const set = (states: readonly State[]) => (states.length === 0 ? "∅" : `{${states.join(", ")}}`);

export function GraphWidget({ machine }: { machine: MachineId }) {
  const m = MACHINES[machine];
  return (
    <figure className="tut-figure">
      <AutomatonGraph automaton={m.automaton} layout={m.layout} viewBox={m.viewBox} current={[]} symbolLabel={m.symbolLabel} className="tut-graph" />
      <figcaption>{m.name}</figcaption>
    </figure>
  );
}

export function DefinitionWidget({ machine }: { machine: MachineId }) {
  const m = MACHINES[machine];
  return (
    <div className="tut-figure">
      <FormalDefinition
        automaton={m.automaton}
        name={m.automaton.kind === "DFA" ? "M" : "N"}
        current={[]}
        live={[]}
        input={[]}
        inputLength={0}
        accepting={false}
        showInput={false}
        symbolLabel={m.symbolLabel}
      />
    </div>
  );
}

/** Step through example inputs: graph, tape, δ table and trace, all from the engine. */
export function StepperWidget({ machine, examples }: { machine: MachineId; examples: readonly StepperExample[] }) {
  const m = MACHINES[machine];
  const [tape, dispatch] = useReducer(tapeReducer, { input: examples[0].input, position: 0, playing: false });
  const [selected, setSelected] = useState(0);
  const prefix = tape.input.slice(0, tape.position);
  const run = useMemo(
    () => (m.automaton.kind === "DFA" ? runDFA(m.automaton as DFA, prefix) : runNFA(m.automaton as NFA, prefix)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [m.automaton, tape.input, tape.position],
  );
  const isDfa = "finalState" in run;
  const current = isDfa ? [run.finalState] : run.finalStates;
  const last = run.trace[run.trace.length - 1];
  const live: Transition[] = !last ? [] : "edges" in last ? [...last.edges] : [{ from: last.from, symbol: last.symbol, to: last.to }];
  const atEnd = tape.position >= tape.input.length;
  const label = m.symbolLabel ?? ((s: string) => s);

  return (
    <div className="tut-widget tut-stepper" data-machine={machine}>
      <div className="tut-examples">
        {examples.map((example, index) => (
          <button
            key={example.label}
            type="button"
            className={index === selected ? "preset-selected" : undefined}
            onClick={pressHandler(() => {
              setSelected(index);
              dispatch({ type: "load", input: example.input });
            })}
          >
            {example.label}
          </button>
        ))}
      </div>
      <InputTape input={tape.input} position={tape.position} symbolLabel={label} />
      <div className="lab-row">
        <button type="button" disabled={atEnd} onClick={pressHandler(() => dispatch({ type: "step" }))}>
          Step ▸
        </button>
        <button type="button" disabled={atEnd} onClick={pressHandler(() => dispatch({ type: "run" }))}>
          Run ▸▸
        </button>
        <button type="button" onClick={pressHandler(() => dispatch({ type: "reset" }))}>
          Reset
        </button>
        <span className="tut-status" data-testid="stepper-status">
          {isDfa ? `current state: ${run.finalState}` : `active set: ${set(run.finalStates)}`}
        </span>
        <span className={`verdict ${run.accepted ? "verdict-accept" : "verdict-reject"}`} data-testid="stepper-verdict">
          {atEnd ? (run.accepted ? "ACCEPTED" : "REJECTED") : `after ${tape.position} of ${tape.input.length}: ${run.accepted ? "in F" : "not in F"}`}
        </span>
      </div>
      <div className="tut-split">
        <AutomatonGraph
          automaton={m.automaton}
          layout={m.layout}
          viewBox={m.viewBox}
          current={current}
          live={live}
          symbolLabel={m.symbolLabel}
          className="tut-graph"
        />
        <FormalDefinition
          automaton={m.automaton}
          name={isDfa ? "M" : "N"}
          current={current}
          live={live}
          input={prefix}
          inputLength={prefix.length}
          accepting={run.accepted}
          symbolLabel={m.symbolLabel}
        />
      </div>
      {isDfa ? (
        <DfaTraceTable run={run} start={m.automaton.start} symbolLabel={label} />
      ) : (
        <NfaTraceTable run={run} start={m.automaton.start} symbolLabel={label} />
      )}
    </div>
  );
}

/** Click a state to highlight its ε-closure. */
export function ClosureWidget({ machine }: { machine: MachineId }) {
  const m = MACHINES[machine];
  const [state, setState] = useState<State>(m.automaton.start);
  const closure = epsilonClosure(m.automaton as NFA, [state]);
  return (
    <div className="tut-widget" data-machine={machine}>
      <div className="lab-row">
        <span className="cmp-row-label">ECLOSE of</span>
        {m.automaton.states.map((s) => (
          <button key={s} type="button" className={s === state ? "preset-selected" : undefined} onClick={pressHandler(() => setState(s))}>
            {s}
          </button>
        ))}
      </div>
      <p className="tut-status" data-testid="closure-result">
        ECLOSE({"{"}
        {state}
        {"}"}) = {set(closure)}
        {closure.length === 1 ? " — no ε-transitions leave it" : ""}
      </p>
      <AutomatonGraph
        automaton={m.automaton}
        layout={m.layout}
        viewBox={m.viewBox}
        current={closure}
        live={m.automaton.transitions.filter((t) => t.symbol === "ε" && closure.includes(t.from))}
        symbolLabel={m.symbolLabel}
        className="tut-graph"
      />
    </div>
  );
}

/** The same input on the suspicious-guard NFA and its subset DFA (reusing the comparison model). */
export function CompareWidget() {
  const [tape, dispatch] = useReducer(tapeReducer, { input: PRESETS[1].input, position: 0, playing: false });
  const result = useMemo(() => compare(tape.input, tape.position), [tape.input, tape.position]);
  const label = MACHINES.guardNfa.symbolLabel!;
  const atEnd = tape.position >= tape.input.length;
  return (
    <div className="tut-widget">
      <div className="tut-examples">
        {PRESETS.map((p) => (
          <button key={p.id} type="button" onClick={pressHandler(() => dispatch({ type: "load", input: p.input }))}>
            {p.label}
          </button>
        ))}
      </div>
      <InputTape input={tape.input} position={tape.position} symbolLabel={label} />
      <div className="lab-row">
        <button type="button" disabled={atEnd} onClick={pressHandler(() => dispatch({ type: "step" }))}>
          Step ▸
        </button>
        <button type="button" onClick={pressHandler(() => dispatch({ type: "reset" }))}>
          Reset
        </button>
      </div>
      <div className="tut-split">
        <figure className="tut-figure">
          <AutomatonGraph
            automaton={COMPARISON_NFA}
            layout={NFA_GRAPH_LAYOUT}
            viewBox={NFA_GRAPH_VIEWBOX}
            current={result.nfa.finalStates}
            live={result.nfaLive}
            symbolLabel={label}
            className="tut-graph"
          />
          <figcaption data-testid="compare-nfa">
            NFA: S = {set(result.nfa.finalStates)} — {result.nfa.accepted ? "accepts" : "rejects"}
          </figcaption>
        </figure>
        <figure className="tut-figure">
          <AutomatonGraph
            automaton={COMPARISON_CONVERSION.dfa}
            layout={SUBSET_GRAPH_LAYOUT}
            viewBox={SUBSET_GRAPH_VIEWBOX}
            current={[result.dfa.finalState]}
            live={result.dfaLive}
            symbolLabel={label}
            stateLabel={dfaStateAlias}
            hideEdge={(edge) => edge.to === TRAP_STATE && edge.from !== TRAP_STATE}
            className="tut-graph"
          />
          <figcaption data-testid="compare-dfa">
            DFA: {dfaStateAlias(result.dfa.finalState)} = {set(result.dfaSubset)} — {result.dfa.accepted ? "accepts" : "rejects"}
          </figcaption>
        </figure>
      </div>
      <p className={result.consistent ? "cmp-agree-ok" : "cmp-agree-bad"} data-testid="compare-agreement">
        {result.consistent ? "✓ The DFA's state is exactly the NFA's active set, and the verdicts agree." : "✗ The machines disagree."}
      </p>
    </div>
  );
}

/** Subset construction revealed one row (one DFA transition) at a time. */
export function SubsetWidget({ machine }: { machine: MachineId }) {
  const m = MACHINES[machine];
  const nfa = m.automaton as NFA;
  const walk = useMemo(() => subsetConstructionSteps(nfa), [nfa]);
  const [shown, setShown] = useState(0);
  const { steps, result, start } = walk;
  const done = shown >= steps.length;
  const rows = steps.slice(0, shown);
  const discovered = shown === 0 ? [start.name] : rows[rows.length - 1].discovered;
  const current = rows[rows.length - 1];
  const layout = useMemo(
    () =>
      machine === "guardNfa"
        ? SUBSET_GRAPH_LAYOUT
        : ellipseLayout(result.dfa.states, { x: 280, y: 170 }, 190, 100, Math.PI),
    [machine, result],
  );
  const viewBox = machine === "guardNfa" ? SUBSET_GRAPH_VIEWBOX : { width: 560, height: 340 };
  const partial: DFA = {
    kind: "DFA",
    states: discovered,
    alphabet: result.dfa.alphabet,
    transitions: rows.map((r) => ({ from: r.fromName, symbol: r.symbol, to: r.toName })),
    start: result.dfa.start,
    accepting: result.dfa.accepting.filter((s) => discovered.includes(s)),
  };
  const equivalence = useMemo(() => (done ? checkEquivalence(nfa, result.dfa, 4000) : null), [done, nfa, result]);
  const label = m.symbolLabel ?? ((s: string) => s);

  return (
    <div className="tut-widget" data-machine={machine}>
      <div className="lab-row">
        <button type="button" disabled={done} onClick={pressHandler(() => setShown((n) => n + 1))}>
          Next row ▸
        </button>
        <button type="button" disabled={done} onClick={pressHandler(() => setShown(steps.length))}>
          Show all
        </button>
        <button type="button" onClick={pressHandler(() => setShown(0))}>
          Restart
        </button>
        <span className="tut-status" data-testid="subset-status">
          {shown === 0
            ? `Start: ECLOSE({${nfa.start}}) = ${set(start.closure)} is the DFA's start state.`
            : `Row ${shown} of ${steps.length} · ${discovered.length} DFA state${discovered.length === 1 ? "" : "s"} found`}
        </span>
      </div>
      <div className="tut-split">
        <figure className="tut-figure">
          <AutomatonGraph
            automaton={nfa}
            layout={m.layout}
            viewBox={m.viewBox}
            current={current ? current.from : start.closure}
            symbolLabel={m.symbolLabel}
            className="tut-graph"
          />
          <figcaption>NFA — highlighted: the subset S being processed</figcaption>
        </figure>
        <figure className="tut-figure">
          <AutomatonGraph
            automaton={partial}
            layout={layout}
            viewBox={viewBox}
            current={current ? [current.toName] : [result.dfa.start]}
            live={current ? [{ from: current.fromName, symbol: current.symbol, to: current.toName }] : []}
            symbolLabel={m.symbolLabel}
            className="tut-graph"
          />
          <figcaption>DFA built so far — each state is a set of NFA states</figcaption>
        </figure>
      </div>
      <table className="trace-table" data-testid="subset-rows">
        <thead>
          <tr>
            <th>S (DFA state)</th>
            <th>symbol a</th>
            <th>move(S, a)</th>
            <th>ECLOSE → δ_D(S, a)</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={i === rows.length - 1 ? "trace-latest" : undefined}>
              <td>{r.fromName}</td>
              <td className="trace-symbol">{label(r.symbol)}</td>
              <td>{set(r.moved)}</td>
              <td>{r.toName}</td>
              <td>{r.isNew ? "new state" : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {done && equivalence && (
        <p className={equivalence.equivalent ? "cmp-agree-ok" : "cmp-agree-bad"} data-testid="subset-equivalence">
          {equivalence.equivalent
            ? `✓ Done: ${result.dfa.states.length} DFA states. The NFA and the DFA agree on all ${equivalence.tested} strings of length ≤ ${equivalence.maxLength}. Accepting DFA states: ${result.dfa.accepting.join(", ")} (the sets containing an accepting NFA state).`
            : "✗ The machines disagree."}
        </p>
      )}
    </div>
  );
}
