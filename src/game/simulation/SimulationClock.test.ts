import { describe, expect, it } from "vitest";
import { OneShotTimer } from "../guard/OneShotTimer";
import { PerceptionTracker } from "../guard/PerceptionTracker";
import { SimulationClock, TICK_MS } from "./SimulationClock";

const FRAME = 1000 / 60;

/** Runs `frames` real frames through the clock, calling `tick` once per simulation tick. */
function runFrames(clock: SimulationClock, frames: number, tick: () => void, frameMs = FRAME): number {
  let ticks = 0;
  for (let i = 0; i < frames; i++) {
    const n = clock.advance(frameMs);
    for (let t = 0; t < n; t++) tick();
    ticks += n;
  }
  return ticks;
}

describe("SimulationClock: running", () => {
  it("runs one tick per 1/60 s of real time", () => {
    const clock = new SimulationClock();
    expect(runFrames(clock, 600, () => {}, FRAME)).toBeGreaterThanOrEqual(599);
    expect(runFrames(new SimulationClock(), 600, () => {}, FRAME)).toBeLessThanOrEqual(600);
  });

  it("keeps the same simulation speed at a lower frame rate (fixed timestep)", () => {
    // 30 fps for 10 s → still ~600 ticks.
    expect(runFrames(new SimulationClock(), 300, () => {}, 1000 / 30)).toBeGreaterThanOrEqual(599);
  });

  it("does not try to catch up after a long stall (e.g. a minimized window)", () => {
    expect(new SimulationClock().advance(10_000)).toBe(Math.floor(250 / TICK_MS));
  });

  it("ignores step requests while running", () => {
    const clock = new SimulationClock();
    clock.step();
    expect(clock.advance(0)).toBe(0);
  });
});

describe("SimulationClock: pause, resume and step", () => {
  it("runs no ticks while paused, however much real time passes", () => {
    const clock = new SimulationClock();
    clock.pause();
    expect(clock.paused).toBe(true);
    expect(runFrames(clock, 600, () => {})).toBe(0);
  });

  it("can start paused", () => {
    const clock = new SimulationClock(true);
    expect(clock.paused).toBe(true);
    expect(clock.advance(1000)).toBe(0);
  });

  it("runs exactly one tick per step while paused", () => {
    const clock = new SimulationClock(true);
    clock.step();
    expect(clock.advance(FRAME)).toBe(1);
    expect(clock.advance(FRAME)).toBe(0);
    clock.step();
    clock.step();
    expect(clock.advance(FRAME)).toBe(2);
  });

  it("resumes from now, without a burst of catch-up ticks", () => {
    const clock = new SimulationClock();
    clock.advance(FRAME / 2); // half a tick accumulated
    clock.pause();
    runFrames(clock, 600, () => {});
    clock.resume();
    expect(clock.paused).toBe(false);
    expect(clock.advance(FRAME / 2)).toBe(0); // the half tick from before the pause was dropped
    expect(clock.advance(FRAME / 2 + 0.01)).toBe(1);
  });

  it("drops unused step requests on resume", () => {
    const clock = new SimulationClock(true);
    clock.step();
    clock.resume();
    expect(clock.advance(0)).toBe(0);
  });
});

describe("timers measured in ticks are exact (no floating-point drift)", () => {
  it.each([700, 650, 1500, 4000])("a %i ms timer fires after exactly ceil(ms / tick) ticks", (ms) => {
    const timer = new OneShotTimer();
    timer.arm(ms);
    let ticks = 0;
    while (!timer.update(TICK_MS)) ticks++;
    expect(ticks + 1).toBe(Math.ceil(ms / TICK_MS - 1e-9));
  });

  it("PLAYER_LOST fires after exactly 90 ticks for a 1500 ms delay", () => {
    const tracker = new PerceptionTracker(1500);
    tracker.update(true, TICK_MS);
    let ticks = 0;
    while (tracker.update(false, TICK_MS) === null) ticks++;
    expect(ticks + 1).toBe(90);
  });
});

describe("pausing freezes the guard's simulation timers", () => {
  it("does not let the ALERT reaction timer expire while paused; resumes where it left off", () => {
    const clock = new SimulationClock();
    const timer = new OneShotTimer();
    let fired = 0;
    const tick = () => {
      if (timer.update(TICK_MS)) fired++;
    };
    timer.arm(700);
    runFrames(clock, 30, tick); // 0.5 s
    clock.pause();
    runFrames(clock, 600, tick); // 10 s of real time, paused
    expect(fired).toBe(0);
    clock.resume();
    runFrames(clock, 11, tick); // ~0.18 s: still short of 0.7 s total
    expect(fired).toBe(0);
    runFrames(clock, 2, tick);
    expect(fired).toBe(1);
  });

  it("does not count paused time toward the PLAYER_LOST delay", () => {
    const clock = new SimulationClock();
    const tracker = new PerceptionTracker(1500);
    const events: string[] = [];
    let visible = true;
    const tick = () => {
      const symbol = tracker.update(visible, TICK_MS);
      if (symbol) events.push(symbol);
    };
    runFrames(clock, 1, tick);
    visible = false;
    runFrames(clock, 60, tick); // 1 s unseen
    clock.pause();
    runFrames(clock, 600, tick); // 10 s paused
    expect(events).toEqual(["PLAYER_SPOTTED"]);
    clock.resume();
    runFrames(clock, 32, tick); // 0.53 s more → 1.53 s unseen in simulation time
    expect(events).toEqual(["PLAYER_SPOTTED", "PLAYER_LOST"]);
  });

  it("advances timers by exactly one tick per step", () => {
    const clock = new SimulationClock(true);
    const timer = new OneShotTimer();
    timer.arm(TICK_MS * 3);
    const fired: boolean[] = [];
    for (let i = 0; i < 3; i++) {
      clock.step();
      for (let t = clock.advance(FRAME); t > 0; t--) fired.push(timer.update(TICK_MS));
    }
    expect(fired).toEqual([false, false, true]);
  });
});
