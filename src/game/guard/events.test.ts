// Event generation must be edge-triggered: one DFA symbol per change, never one per frame.
import { describe, expect, it } from "vitest";
import { OneShotTimer } from "./OneShotTimer";
import { PerceptionTracker } from "./PerceptionTracker";

const FRAME = 1000 / 60;

/** Runs the tracker over a sequence of per-frame visibility values and returns the events emitted. */
function events(tracker: PerceptionTracker, frames: boolean[]): string[] {
  return frames.map((visible) => tracker.update(visible, FRAME)).filter((symbol) => symbol !== null);
}
const seconds = (s: number, visible: boolean) => Array<boolean>(Math.round((s * 1000) / FRAME)).fill(visible);

describe("PerceptionTracker", () => {
  it("emits nothing while the player is never seen", () => {
    expect(events(new PerceptionTracker(1500), seconds(5, false))).toEqual([]);
  });

  it("emits PLAYER_SPOTTED once, not every frame the player stays visible", () => {
    expect(events(new PerceptionTracker(1500), seconds(5, true))).toEqual(["PLAYER_SPOTTED"]);
  });

  it("emits PLAYER_LOST only after sight is lost for the full delay", () => {
    const tracker = new PerceptionTracker(1500);
    expect(events(tracker, [true, ...seconds(1.4, false)])).toEqual(["PLAYER_SPOTTED"]);
    expect(events(tracker, seconds(0.2, false))).toEqual(["PLAYER_LOST"]);
    expect(events(tracker, seconds(5, false))).toEqual([]);
  });

  it("ignores brief occlusions shorter than the delay", () => {
    const tracker = new PerceptionTracker(1500);
    expect(events(tracker, [...seconds(1, true), ...seconds(1, false), ...seconds(1, true), ...seconds(1, false)])).toEqual([
      "PLAYER_SPOTTED",
    ]);
  });

  it("emits PLAYER_SPOTTED again after the player was lost", () => {
    const tracker = new PerceptionTracker(1500);
    expect(events(tracker, [...seconds(1, true), ...seconds(2, false), ...seconds(1, true)])).toEqual([
      "PLAYER_SPOTTED",
      "PLAYER_LOST",
      "PLAYER_SPOTTED",
    ]);
  });
});

describe("OneShotTimer", () => {
  it("does nothing until armed", () => {
    const timer = new OneShotTimer();
    expect(timer.armed).toBe(false);
    expect(timer.update(10_000)).toBe(false);
  });

  it("fires exactly once, then disarms", () => {
    const timer = new OneShotTimer();
    timer.arm(100);
    const fired = Array.from({ length: 30 }, () => timer.update(FRAME));
    expect(fired.filter(Boolean)).toHaveLength(1);
    expect(fired.indexOf(true)).toBe(5); // 6 frames of 16.7 ms ≥ 100 ms
    expect(timer.armed).toBe(false);
  });

  it("can be cancelled, and re-arming restarts the countdown", () => {
    const timer = new OneShotTimer();
    timer.arm(100);
    timer.cancel();
    expect(timer.update(200)).toBe(false);
    timer.arm(100);
    timer.update(90);
    timer.arm(100);
    expect(timer.update(90)).toBe(false);
    expect(timer.update(10)).toBe(true);
  });
});
