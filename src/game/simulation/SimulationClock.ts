// Pure TypeScript: no Phaser imports, so this can be unit-tested in Node.

/** Length of one simulation tick: the game logic and physics always advance in steps of 1/60 s. */
export const TICK_MS = 1000 / 60;

/** Real time that can be caught up in one frame; longer gaps (e.g. a minimized window) are dropped. */
const MAX_FRAME_MS = 250;

/**
 * Decides how many fixed simulation ticks to run each rendered frame.
 *
 *   running → as many ticks as real time requires (fixed timestep with an accumulator);
 *   paused  → zero ticks, except one per requested step.
 *
 * Because everything that changes the game (physics, perception, DFA timers, movement) runs only
 * inside ticks, a paused game is completely frozen and a step advances it by exactly one tick.
 */
export class SimulationClock {
  private accumulatorMs = 0;
  private pendingSteps = 0;
  private pausedFlag: boolean;

  constructor(paused = false) {
    this.pausedFlag = paused;
  }

  get paused(): boolean {
    return this.pausedFlag;
  }

  pause(): void {
    this.pausedFlag = true;
    this.accumulatorMs = 0;
  }

  /** Resumes from now: time spent paused is never "caught up". */
  resume(): void {
    this.pausedFlag = false;
    this.accumulatorMs = 0;
    this.pendingSteps = 0;
  }

  /** Requests exactly one tick on the next frame. Ignored while running. */
  step(): void {
    if (this.pausedFlag) this.pendingSteps++;
  }

  /** Call once per rendered frame with the real elapsed time; returns the number of ticks to run. */
  advance(realDeltaMs: number): number {
    if (this.pausedFlag) {
      const steps = this.pendingSteps;
      this.pendingSteps = 0;
      return steps;
    }
    this.accumulatorMs += Math.min(Math.max(realDeltaMs, 0), MAX_FRAME_MS);
    const ticks = Math.floor(this.accumulatorMs / TICK_MS);
    this.accumulatorMs -= ticks * TICK_MS;
    return ticks;
  }
}
