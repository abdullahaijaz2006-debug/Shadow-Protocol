import { useEffect, useMemo, useReducer, useState } from "react";
import type { InputSymbol } from "../../automata";
import { GUARD_SYMBOLS, type GuardSymbol } from "../../game/guard/guardDfa";
import { AutomatonGraph } from "../visualizer/AutomatonGraph";
import { FormalDefinition } from "../visualizer/FormalDefinition";
import { GUARD_SYMBOL_LABELS } from "../visualizer/guardLayout";
import { pressHandler } from "../visualizer/pressHandler";
import { NFA_GRAPH_LAYOUT, NFA_GRAPH_VIEWBOX, SUBSET_GRAPH_LAYOUT, SUBSET_GRAPH_VIEWBOX, TRAP_STATE } from "./comparisonLayouts";
import {
  compare,
  COMPARISON_CONVERSION,
  COMPARISON_NFA,
  comparisonReducer,
  dfaStateAlias,
  INITIAL_COMPARISON,
  PRESETS,
} from "./comparisonModel";
import { DfaTrace, NfaTrace, SubsetTable } from "./ComparisonTraces";
import { InputTape } from "./InputTape";

/** Time between symbols while playing. */
const PLAY_INTERVAL_MS = 900;

const symbolLabel = (symbol: InputSymbol) => GUARD_SYMBOL_LABELS[symbol as GuardSymbol] ?? symbol;
const subsetTitle = (state: string) => {
  const subset = COMPARISON_CONVERSION.subsets[state];
  return `${dfaStateAlias(state)} = ${subset.length === 0 ? "∅" : `{${subset.join(", ")}}`}`;
};

type Tab = "traces" | "subsets" | "nfa" | "dfa";
const TABS: readonly [Tab, string][] = [
  ["traces", "Traces"],
  ["subsets", "Subset states"],
  ["nfa", "N — definition"],
  ["dfa", "D — definition"],
];

function Verdict({ accepted, label }: { accepted: boolean; label: string }) {
  return (
    <span className={`verdict ${accepted ? "verdict-accept" : "verdict-reject"}`}>
      {label}: {accepted ? "ACCEPTS w (in F)" : "REJECTS w (not in F)"}
    </span>
  );
}

/**
 * NFA ⇄ DFA comparison mode. Self-contained: it feeds the same input to the scenario NFA and to its
 * subset-constructed DFA using the Milestone 2 engine, and never talks to the game, so the guards
 * in the level keep running on their own DFAs.
 */
export function ComparisonPanel() {
  const [state, dispatch] = useReducer(comparisonReducer, INITIAL_COMPARISON);
  const [tab, setTab] = useState<Tab>("traces");
  const [showTrapEdges, setShowTrapEdges] = useState(false);
  const result = useMemo(() => compare(state.input, state.position), [state.input, state.position]);
  const { nfa, dfa, dfaSubset } = result;

  useEffect(() => {
    if (!state.playing) return;
    const timer = window.setInterval(() => dispatch({ type: "step" }), PLAY_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [state.playing]);

  const atEnd = state.position >= state.input.length;
  const preset = PRESETS.find((p) => p.input.length === state.input.length && p.input.every((s, i) => s === state.input[i]));

  return (
    <section className="comparison" aria-label="NFA and DFA comparison">
      <header className="cmp-header">
        <h2 className="panel-title">NFA ⇄ DFA · same input, two machines</h2>
        <p className="cmp-explain">
          <strong>Nondeterminism is not randomness:</strong> N never picks a path by chance or with a probability — it follows{" "}
          <em>every</em> computation path at once. S is the set of all states some path could be in, and N accepts if{" "}
          <em>at least one</em> path ends in F. D tracks that whole set as a single state (subset construction). Demonstration
          only: the guards in the level keep running their own DFAs, and F = {"{"}CAPTURE{"}"} marks accepted event histories.
        </p>
      </header>

      <div className="cmp-controls">
        <InputTape input={state.input} position={state.position} symbolLabel={symbolLabel} />
        <div className="cmp-row">
          <span className="cmp-row-label">add</span>
          {GUARD_SYMBOLS.map((symbol) => (
            <button key={symbol} type="button" title={symbol} onClick={pressHandler(() => dispatch({ type: "append", symbol }))}>
              +{symbolLabel(symbol)}
            </button>
          ))}
          <button type="button" title="Remove the last symbol" disabled={state.input.length === 0} onClick={pressHandler(() => dispatch({ type: "removeLast" }))}>
            ⌫
          </button>
          <span className="cmp-sep" />
          <button type="button" disabled={atEnd} title="Both machines read the next symbol" onClick={pressHandler(() => dispatch({ type: "step" }))}>
            Step ▸
          </button>
          <button
            type="button"
            disabled={atEnd && !state.playing}
            onClick={pressHandler(() => dispatch({ type: state.playing ? "pause" : "play" }))}
          >
            {state.playing ? "❚❚ Pause" : "▶ Play"}
          </button>
          <button type="button" title="Back to the start (nothing read)" onClick={pressHandler(() => dispatch({ type: "reset" }))}>
            Reset
          </button>
          <button type="button" title="Empty the input" onClick={pressHandler(() => dispatch({ type: "clear" }))}>
            Clear
          </button>
        </div>
        <div className="cmp-row">
          <span className="cmp-row-label">examples</span>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={preset?.id === p.id ? "preset-selected" : undefined}
              onClick={pressHandler(() => dispatch({ type: "load", input: p.input }))}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset && <p className="cmp-note">{preset.note}</p>}
      </div>

      <div className="cmp-machines">
        <div className="cmp-machine" data-machine="nfa">
          <h3>
            N — NFA <span className="formal-dim">(active set after {state.position} symbol{state.position === 1 ? "" : "s"})</span>
          </h3>
          <AutomatonGraph
            automaton={COMPARISON_NFA}
            layout={NFA_GRAPH_LAYOUT}
            viewBox={NFA_GRAPH_VIEWBOX}
            current={nfa.finalStates}
            live={result.nfaLive}
            symbolLabel={symbolLabel}
            className="cmp-graph"
          />
          <p className="cmp-status">
            <span className="cmp-set" data-testid="nfa-active">
              S = {nfa.finalStates.length === 0 ? "∅ (every path died)" : `{${nfa.finalStates.join(", ")}}`}
            </span>
            <Verdict accepted={nfa.accepted} label="N" />
          </p>
        </div>

        <div className="cmp-machine" data-machine="dfa">
          <h3>
            D — subset DFA <span className="formal-dim">(one state = N's whole set)</span>
            <button
              type="button"
              className="link-button cmp-trap-toggle"
              aria-pressed={showTrapEdges}
              onClick={pressHandler(() => setShowTrapEdges((show) => !show))}
            >
              {showTrapEdges ? "hide" : "show"} edges into ∅
            </button>
          </h3>
          <AutomatonGraph
            automaton={COMPARISON_CONVERSION.dfa}
            layout={SUBSET_GRAPH_LAYOUT}
            viewBox={SUBSET_GRAPH_VIEWBOX}
            current={[dfa.finalState]}
            live={result.dfaLive}
            symbolLabel={symbolLabel}
            stateLabel={dfaStateAlias}
            stateTitle={subsetTitle}
            hideEdge={(edge) => !showTrapEdges && edge.to === TRAP_STATE && edge.from !== TRAP_STATE}
            className="cmp-graph"
          />
          <p className="cmp-status">
            <span className="cmp-set" data-testid="dfa-current">
              {dfaStateAlias(dfa.finalState)} = {dfaSubset.length === 0 ? "∅" : `{${dfaSubset.join(", ")}}`}
            </span>
            <Verdict accepted={dfa.accepted} label="D" />
          </p>
        </div>
      </div>

      <p className={`cmp-agree ${result.consistent ? "cmp-agree-ok" : "cmp-agree-bad"}`} data-testid="agreement">
        {result.consistent
          ? `✓ ${dfaStateAlias(dfa.finalState)} stands for exactly N's active set, and both machines give the same verdict.`
          : "✗ The machines disagree — this should never happen."}
      </p>

      <div className="tabs" role="tablist">
        {TABS.map(([name, label]) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={tab === name}
            className={`tab${tab === name ? " tab-selected" : ""}`}
            onClick={pressHandler(() => setTab(name))}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="tab-body cmp-tab-body">
        {tab === "traces" && (
          <div className="cmp-traces">
            <div>
              <h4>N's trace</h4>
              <NfaTrace result={result} symbolLabel={symbolLabel} />
              <p className="formal-dim formal-note">
                <span className="trace-eps-added">violet</span> = added by the ε-closure, <span className="trace-dead">∅</span> = all paths died.
              </p>
            </div>
            <div>
              <h4>D's trace</h4>
              <DfaTrace result={result} symbolLabel={symbolLabel} />
            </div>
          </div>
        )}
        {tab === "subsets" && <SubsetTable current={dfa.finalState} />}
        {tab === "nfa" && (
          <FormalDefinition
            automaton={COMPARISON_NFA}
            name="N"
            current={nfa.finalStates}
            live={result.nfaLive}
            input={result.consumed}
            inputLength={result.consumed.length}
            accepting={nfa.accepted}
            symbolLabel={symbolLabel}
            acceptingNote="N accepts w if at least one computation path ends in F"
          />
        )}
        {tab === "dfa" && (
          <FormalDefinition
            automaton={COMPARISON_CONVERSION.dfa}
            name="D"
            current={[dfa.finalState]}
            live={result.dfaLive}
            input={result.consumed}
            inputLength={result.consumed.length}
            accepting={dfa.accepted}
            symbolLabel={symbolLabel}
            stateLabel={dfaStateAlias}
            acceptingNote="the subsets that contain an accepting NFA state (here CAPTURE)"
          />
        )}
      </div>
    </section>
  );
}
