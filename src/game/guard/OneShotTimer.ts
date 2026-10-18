// Pure TypeScript: no Phaser imports, so this can be unit-tested in Node.

/**
 * Tolerance for floating-point drift: 42 ticks of 1000/60 ms can sum to 699.9999999 rather than
 * 700, which would otherwise make a 700 ms timer fire one tick late.
 */
export const TIME_EPSILON_MS = 1e-6;

/** A countdown that fires once (producing a single TIMER_EXPIRED), then disarms itself. */
export class OneShotTimer {
  private remainingMs: number | null = null;

  get armed(): boolean {
    return this.remainingMs !== null;
  }

  /** Starts (or restarts) the countdown. */
  arm(durationMs: number): void {
    this.remainingMs = durationMs;
  }

  cancel(): void {
    this.remainingMs = null;
  }

  /** Call once per frame. Returns true on exactly the frame the countdown reaches zero. */
  update(deltaMs: number): boolean {
    if (this.remainingMs === null) return false;
    this.remainingMs -= deltaMs;
    if (this.remainingMs > TIME_EPSILON_MS) return false;
    this.remainingMs = null;
    return true;
  }
}
