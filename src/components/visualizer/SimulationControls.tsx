import type { GameBridge } from "../../game/bridge";
import { TICK_MS } from "../../game/simulation/SimulationClock";
import { useGameSelector } from "../useGameSelector";
import { pressHandler } from "./pressHandler";

/**
 * Pause / resume / step / next event / reset, sent to the game as commands through the bridge.
 * They control the whole simulation, so they apply to every guard at once.
 */
export function SimulationControls({ bridge }: { bridge: GameBridge }) {
  const ready = useGameSelector(bridge, (s) => s.ready);
  const paused = useGameSelector(bridge, (s) => s.paused);
  // The tick is only shown while paused; ignoring it while running avoids a re-render per guard event.
  const tick = useGameSelector(bridge, (s) => (s.paused ? s.tick : -1));
  const { send } = bridge;

  return (
    <div className="sim-controls">
      <div className="sim-buttons">
        <button type="button" disabled={!ready} onClick={pressHandler(() => send({ type: paused ? "resume" : "pause" }))}>
          {paused ? "▶ Resume" : "❚❚ Pause"}
        </button>
        <button
          type="button"
          disabled={!ready || !paused}
          title="Advance the whole simulation (every guard) by one tick (1/60 s)"
          onClick={pressHandler(() => send({ type: "step" }))}
        >
          Step
        </button>
        <button
          type="button"
          disabled={!ready || !paused}
          title="Run ticks until any guard's DFA processes its next event"
          onClick={pressHandler(() => send({ type: "stepToEvent" }))}
        >
          Next event
        </button>
        <button
          type="button"
          disabled={!ready}
          title="Restart the level with a fresh DFA run for every guard"
          onClick={pressHandler(() => send({ type: "reset" }))}
        >
          Reset
        </button>
      </div>
      <p className="sim-status">
        {paused ? (
          <>
            <span className="sim-paused">PAUSED</span> · tick {tick} ({((tick * TICK_MS) / 1000).toFixed(2)} s simulated) · all
            guards
          </>
        ) : (
          <span className="sim-running">RUNNING</span>
        )}
      </p>
    </div>
  );
}
