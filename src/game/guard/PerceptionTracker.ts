// Pure TypeScript: no Phaser imports, so this can be unit-tested in Node.
import type { GuardSymbol } from "./guardDfa";
import { TIME_EPSILON_MS } from "./OneShotTimer";

/**
 * Turns the per-frame "can the guard see the player?" signal into discrete DFA events, so the
 * runner receives one symbol per change instead of one per frame:
 *   - PLAYER_SPOTTED once, on the frame sight is gained;
 *   - PLAYER_LOST once, after sight has been lost continuously for `lostDelayMs`.
 * A brief occlusion (shorter than the delay) produces no events at all.
 */
export class PerceptionTracker {
  /** Has PLAYER_SPOTTED been emitted without a matching PLAYER_LOST yet? */
  private aware = false;
  private unseenForMs = 0;

  constructor(private readonly lostDelayMs: number) {}

  /** Call once per frame. Returns the event to feed to the DFA, if any. */
  update(visible: boolean, deltaMs: number): GuardSymbol | null {
    if (visible) {
      this.unseenForMs = 0;
      if (this.aware) return null;
      this.aware = true;
      return "PLAYER_SPOTTED";
    }
    if (!this.aware) return null;
    this.unseenForMs += deltaMs;
    if (this.unseenForMs < this.lostDelayMs - TIME_EPSILON_MS) return null;
    this.aware = false;
    this.unseenForMs = 0;
    return "PLAYER_LOST";
  }
}
