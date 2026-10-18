import { useState } from "react";
import type { GameBridge } from "../../game/bridge";
import { GUARD_DFA, type GuardSymbol } from "../../game/guard/guardDfa";
import { useGameSelector } from "../useGameSelector";
import { AutomatonGraph, type HighlightedTransition } from "./AutomatonGraph";
import { FormalDefinition } from "./FormalDefinition";
import { GUARD_GRAPH_LAYOUT, GUARD_GRAPH_VIEWBOX, GUARD_SYMBOL_LABELS } from "./guardLayout";
import { HistoryPanel } from "./HistoryPanel";
import { pressHandler } from "./pressHandler";
import { SimulationControls } from "./SimulationControls";

type Tab = "history" | "definition";

const symbolLabel = (symbol: string) => GUARD_SYMBOL_LABELS[symbol as GuardSymbol] ?? symbol;

/** An inspected history row: tied to one run of the level and one guard. */
interface Selection {
  readonly runId: number;
  readonly guardId: string;
  readonly step: number;
}

/**
 * The live visualizer for the selected guard's DFA. Reads only bridge snapshots and writes only
 * commands. It re-renders only when the selected guard's own snapshot changes (or the selection),
 * not when other guards process events.
 */
export function AutomatonPanel({ bridge }: { bridge: GameBridge }) {
  const [tab, setTab] = useState<Tab>("history");
  const [selection, setSelection] = useState<Selection | null>(null);

  const runId = useGameSelector(bridge, (s) => s.runId);
  const guard = useGameSelector(bridge, (s) => s.guards.find((g) => g.id === s.selectedGuardId) ?? null);

  const history = guard?.history ?? [];
  const last: HighlightedTransition | null = history.length > 0 ? history[history.length - 1] : null;
  // A selection only applies to the run and guard it was made in.
  const selectedStep =
    selection !== null && guard !== null && selection.runId === runId && selection.guardId === guard.id ? selection.step : null;
  const inspected: HighlightedTransition | null = history.find((t) => t.step === selectedStep) ?? null;
  const setSelectedStep = (step: number | null) =>
    setSelection(step === null || guard === null ? null : { runId, guardId: guard.id, step });

  return (
    <aside className="automaton-panel" aria-label="Guard automaton">
      <h2 className="panel-title">
        {guard && <span className="guard-swatch" style={{ background: guard.color }} />}
        {guard ? `${guard.name.toUpperCase()} · DFA` : "GUARD DFA"}
        <span className="panel-subtitle">click a guard to inspect it</span>
      </h2>
      <SimulationControls bridge={bridge} />

      <AutomatonGraph
        automaton={GUARD_DFA}
        layout={GUARD_GRAPH_LAYOUT}
        viewBox={GUARD_GRAPH_VIEWBOX}
        current={guard ? [guard.state] : []}
        live={last ? [last] : []}
        inspected={inspected}
        symbolLabel={symbolLabel}
      />
      <p className="graph-legend">
        <span className="legend-current">■</span> current state <span className="legend-live">━</span> last transition
        {inspected && (
          <>
            {" "}
            <span className="legend-inspect">━</span> inspecting #{selectedStep}
          </>
        )}
      </p>

      <div className="tabs" role="tablist">
        {(["history", "definition"] as const).map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={tab === name}
            className={`tab${tab === name ? " tab-selected" : ""}`}
            onClick={pressHandler(() => setTab(name))}
          >
            {name === "history" ? `Transition history (${guard?.eventCount ?? 0})` : "Formal definition"}
          </button>
        ))}
      </div>
      <div className="tab-body">
        {guard &&
          (tab === "history" ? (
            <HistoryPanel
              history={history}
              total={guard.eventCount}
              selectedStep={inspected ? selectedStep : null}
              onSelect={setSelectedStep}
            />
          ) : (
            <FormalDefinition
              automaton={GUARD_DFA}
              current={[guard.state]}
              live={last ? [last] : []}
              inspected={inspected}
              input={history.map((t) => t.symbol)}
              inputLength={guard.eventCount}
              accepting={guard.accepting}
              symbolLabel={symbolLabel}
            />
          ))}
      </div>
    </aside>
  );
}
