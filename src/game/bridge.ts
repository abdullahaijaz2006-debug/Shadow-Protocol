// The only interface between the game and React. Pure TypeScript: no Phaser or React imports.
import type { GuardState, GuardSymbol } from "./guard/guardDfa";

/** Phaser registry key under which scenes find the GameBridge. */
export const BRIDGE_REGISTRY_KEY = "bridge";

/** Commands React can send. The game applies them at the start of the next frame, in order. */
export type GameCommand =
  /** Stop advancing the simulation (all guards). */
  | { readonly type: "pause" }
  | { readonly type: "resume" }
  /** While paused: run exactly one simulation tick (every guard ticks once). */
  | { readonly type: "step" }
  /** While paused: run ticks until any guard's DFA processes at least one event. */
  | { readonly type: "stepToEvent" }
  /** Restart the level with fresh DFA runs for every guard (paused/running mode and selection are kept). */
  | { readonly type: "reset" }
  /** Show this guard in the visualizer. Changes only what is displayed, never guard behaviour. */
  | { readonly type: "selectGuard"; readonly guardId: string }
  /** Ignore game keys entirely (e.g. while the Automata Lab is open), so R or Space do nothing. */
  | { readonly type: "setKeyboardEnabled"; readonly enabled: boolean }
  /** Purely visual options from the Settings (vision cones, shake / flash / icon animations). */
  | { readonly type: "setDisplayOptions"; readonly visionCones: boolean; readonly effects: boolean };

/** One processed DFA event, copied out of a runner's history for display. */
export interface TransitionView {
  /** 1-based position in that guard's input string (the runner's own numbering). */
  readonly step: number;
  readonly from: GuardState;
  readonly symbol: GuardSymbol;
  readonly to: GuardState;
  /** Simulation tick during which the event was processed. */
  readonly tick: number;
}

/**
 * One guard, as the UI sees it. Immutable, and the same object is reused until this guard
 * processes another event, so React components showing other guards do not re-render.
 */
export interface GuardSnapshot {
  readonly id: string;
  readonly name: string;
  /** CSS color for this guard. */
  readonly color: string;
  readonly state: GuardState;
  /** Is this guard's input string so far in L(M)? */
  readonly accepting: boolean;
  /** Total number of events this guard's runner has processed (|w|). */
  readonly eventCount: number;
  /** The most recent events (at most HISTORY_DISPLAY_LIMIT), oldest first, with their true step numbers. */
  readonly history: readonly TransitionView[];
}

/** Everything the UI shows. Immutable: a new object is published on every change. */
export interface GameSnapshot {
  /** False until the game scene has started. */
  readonly ready: boolean;
  /** Increases on every level start (including resets), so the UI can tell runs apart. */
  readonly runId: number;
  readonly paused: boolean;
  /** Simulation ticks since the level started. Updated on events and while paused, not every frame. */
  readonly tick: number;
  /** Guards in ID order. */
  readonly guards: readonly GuardSnapshot[];
  readonly selectedGuardId: string | null;
  /** The guard that caught the player, if any. */
  readonly capturedBy: string | null;
}

export const INITIAL_SNAPSHOT: GameSnapshot = {
  ready: false,
  runId: 0,
  paused: false,
  tick: 0,
  guards: [],
  selectedGuardId: null,
  capturedBy: null,
};

/**
 * Game → UI: `publish` a snapshot; React reads it with `subscribe` + `getSnapshot`
 * (the `useSyncExternalStore` contract: the same object is returned until something changes).
 * UI → game: `send` queues a command; the game drains the queue with `takeCommands`.
 */
export class GameBridge {
  private snapshot: GameSnapshot = INITIAL_SNAPSHOT;
  private readonly listeners = new Set<() => void>();
  private commands: GameCommand[] = [];

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly getSnapshot = (): GameSnapshot => this.snapshot;

  publish(snapshot: GameSnapshot): void {
    this.snapshot = snapshot;
    for (const listener of this.listeners) listener();
  }

  readonly send = (command: GameCommand): void => {
    this.commands.push(command);
  };

  /** Returns and clears the queued commands, oldest first. */
  takeCommands(): GameCommand[] {
    const commands = this.commands;
    this.commands = [];
    return commands;
  }
}
