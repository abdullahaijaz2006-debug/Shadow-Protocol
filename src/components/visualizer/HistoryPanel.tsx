import type { TransitionView } from "../../game/bridge";
import { TICK_MS } from "../../game/simulation/SimulationClock";
import { pressHandler } from "./pressHandler";

interface HistoryPanelProps {
  /** The most recent events (possibly capped), oldest first. */
  readonly history: readonly TransitionView[];
  /** Total number of events the runner has processed. */
  readonly total: number;
  /** The `step` of the row being inspected, if any. */
  readonly selectedStep: number | null;
  readonly onSelect: (step: number | null) => void;
}

/**
 * The runner's transition history, newest first: previous state, input symbol, next state.
 * Selecting a row only highlights it in the graph and table; it never touches the game.
 */
export function HistoryPanel({ history, total, selectedStep, onSelect }: HistoryPanelProps) {
  if (history.length === 0) {
    return <p className="history-empty">No events yet. The DFA is in its start state; the input so far is ε.</p>;
  }
  return (
    <div className="history">
      <div className="history-header">
        <span>
          {total === history.length ? `${total} event${total === 1 ? "" : "s"}` : `last ${history.length} of ${total} events`} ·
          click a row to inspect it
        </span>
        {selectedStep !== null && (
          <button type="button" className="link-button" onClick={pressHandler(() => onSelect(null))}>
            stop inspecting
          </button>
        )}
      </div>
      <ol className="history-list" reversed>
        {[...history].reverse().map((t) => (
          <li key={t.step}>
            <button
              type="button"
              className={`history-row${t.step === selectedStep ? " history-row-selected" : ""}${t.from === t.to ? " history-row-self" : ""}`}
              aria-pressed={t.step === selectedStep}
              onClick={pressHandler(() => onSelect(t.step === selectedStep ? null : t.step))}
            >
              <span className="history-step">#{t.step}</span>
              <span className="history-time">{((t.tick * TICK_MS) / 1000).toFixed(2)}s</span>
              <span className="history-state">{t.from}</span>
              <span className="history-symbol">─{t.symbol}→</span>
              <span className="history-state">{t.to}</span>
              {t.from === t.to && <span className="history-tag">self-loop</span>}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
