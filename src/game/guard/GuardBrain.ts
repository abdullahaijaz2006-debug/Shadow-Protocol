// Pure TypeScript: no Phaser imports, so this can be unit-tested in Node.
import { AutomatonRunner, type TransitionRecord } from "../../automata";
import { GUARD_DFA, type GuardState, type GuardSymbol } from "./guardDfa";

/**
 * The guard's decision layer: a thin wrapper around the Milestone 2 AutomatonRunner.
 * The guard's high-level state is always read from here; nothing else decides it.
 */
export class GuardBrain {
  private readonly runner = new AutomatonRunner(GUARD_DFA);

  /** The current DFA state (a DFA configuration always holds exactly one state). */
  get state(): GuardState {
    return this.runner.current[0] as GuardState;
  }

  /** Is the event history so far in L(M), i.e. has the player been captured? */
  get isAccepting(): boolean {
    return this.runner.isAccepting;
  }

  /** Every processed event, oldest first (the runner's transition history). */
  get history(): readonly TransitionRecord[] {
    return this.runner.history;
  }

  get lastRecord(): TransitionRecord | null {
    const history = this.runner.history;
    return history.length > 0 ? history[history.length - 1] : null;
  }

  /** Feeds one event symbol to the DFA and returns the recorded transition. */
  process(symbol: GuardSymbol): TransitionRecord {
    return this.runner.feed(symbol);
  }
}
