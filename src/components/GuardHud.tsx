import type { GameBridge } from "../game/bridge";
import { playerStatus, STATE_GLYPH } from "./playerStatus";
import { useGameSelector } from "./useGameSelector";
import { pressHandler } from "./visualizer/pressHandler";

/**
 * Status bar above the game: the player's situation, then one chip per guard (color, name, DFA
 * state). Clicking a chip selects that guard for the visualizer — the same as clicking the guard
 * in the game.
 */
export function GuardHud({ bridge }: { bridge: GameBridge }) {
  const guards = useGameSelector(bridge, (s) => s.guards);
  const selectedId = useGameSelector(bridge, (s) => s.selectedGuardId);
  const capturedBy = useGameSelector(bridge, (s) => s.capturedBy);
  const paused = useGameSelector(bridge, (s) => s.paused);
  const captor = guards.find((guard) => guard.id === capturedBy);
  const status = playerStatus(guards);

  return (
    <div className="hud" aria-live="polite">
      <span className={`player-status player-status-${status.kind}`} data-testid="player-status" key={status.kind}>
        <span className="hud-label">YOU</span> {status.label}
        <span className="player-status-detail">{status.detail}</span>
      </span>
      <div className="guard-selector" role="radiogroup" aria-label="Guard shown in the automaton panel">
        {guards.map((guard) => (
          <button
            key={guard.id}
            type="button"
            role="radio"
            aria-checked={guard.id === selectedId}
            className={`guard-chip${guard.id === selectedId ? " guard-chip-selected" : ""}`}
            style={{ borderColor: guard.id === selectedId ? guard.color : undefined }}
            data-guard={guard.id}
            onClick={pressHandler(() => bridge.send({ type: "selectGuard", guardId: guard.id }))}
          >
            <span className="guard-swatch" style={{ background: guard.color }} />
            <span className="guard-chip-name">{guard.name}</span>
            {/* Keyed by state, so the chip flashes briefly whenever the state changes. */}
            <span key={guard.state} className={`hud-state hud-state-${guard.state.toLowerCase()} state-flash`}>
              <span className="state-glyph" aria-hidden="true">
                {STATE_GLYPH[guard.state]}
              </span>
              {guard.state}
            </span>
          </button>
        ))}
      </div>
      {/* The status badge already says who caught the player; keep this short so it stays on one line. */}
      {captor && <span className="hud-captured">press R to restart</span>}
      {paused && <span className="hud-paused">PAUSED</span>}
    </div>
  );
}
