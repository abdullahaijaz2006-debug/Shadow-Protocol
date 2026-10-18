// Builds the UI's guard snapshots from the runners. Pure TypeScript: no Phaser imports.
import type { TransitionRecord } from "../automata";
import type { GuardSnapshot, TransitionView } from "./bridge";
import type { GuardState, GuardSymbol } from "./guard/guardDfa";

/** How many of each guard's most recent events the UI receives (and shows). */
export const HISTORY_DISPLAY_LIMIT = 50;

/** What the snapshot is built from: a guard's identity plus its runner's state and history. */
export interface GuardSource {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly state: GuardState;
  readonly accepting: boolean;
  /** The runner's full transition history. */
  readonly history: readonly TransitionRecord[];
  /** Tick at which each history entry was processed (same indices as `history`). */
  readonly eventTicks: readonly number[];
}

/**
 * The snapshot for one guard. Returns `previous` itself when nothing has changed (the guard has
 * processed no new events), so React can skip re-rendering anything that shows this guard.
 * Only the last `limit` events are copied, keeping each one's true step number.
 */
export function guardSnapshot(
  previous: GuardSnapshot | undefined,
  source: GuardSource,
  limit = HISTORY_DISPLAY_LIMIT,
): GuardSnapshot {
  // A guard's state only changes by processing an event, so the event count identifies a version.
  if (previous && previous.id === source.id && previous.eventCount === source.history.length) return previous;

  const first = Math.max(0, source.history.length - limit);
  const history = source.history.slice(first).map(
    (record, offset): TransitionView => ({
      step: record.step,
      from: record.from[0] as GuardState,
      symbol: record.symbol as GuardSymbol,
      to: record.to[0] as GuardState,
      tick: source.eventTicks[first + offset] ?? 0,
    }),
  );
  return {
    id: source.id,
    name: source.name,
    color: source.color,
    state: source.state,
    accepting: source.accepting,
    eventCount: source.history.length,
    history,
  };
}

/** Reuses the previous array when every guard snapshot is unchanged. */
export function sameGuards(previous: readonly GuardSnapshot[], next: readonly GuardSnapshot[]): boolean {
  return previous.length === next.length && previous.every((guard, index) => guard === next[index]);
}
