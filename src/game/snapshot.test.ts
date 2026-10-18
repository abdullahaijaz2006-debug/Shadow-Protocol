import { describe, expect, it } from "vitest";
import { GuardBrain } from "./guard/GuardBrain";
import { guardSnapshot, HISTORY_DISPLAY_LIMIT, sameGuards, type GuardSource } from "./snapshot";

function source(brain: GuardBrain, id = "G1"): GuardSource {
  return {
    id,
    name: `Guard ${id}`,
    color: "#ff0000",
    state: brain.state,
    accepting: brain.isAccepting,
    history: brain.history,
    eventTicks: brain.history.map((record) => record.step * 10),
  };
}

describe("guardSnapshot", () => {
  it("copies state, acceptance and the history with ticks", () => {
    const brain = new GuardBrain();
    brain.process("PLAYER_SPOTTED");
    const snapshot = guardSnapshot(undefined, source(brain));
    expect(snapshot).toMatchObject({ id: "G1", state: "ALERT", accepting: false, eventCount: 1 });
    expect(snapshot.history).toEqual([{ step: 1, from: "PATROL", symbol: "PLAYER_SPOTTED", to: "ALERT", tick: 10 }]);
  });

  it("returns the same object while the guard has no new events (no React re-render)", () => {
    const brain = new GuardBrain();
    const first = guardSnapshot(undefined, source(brain));
    expect(guardSnapshot(first, source(brain))).toBe(first);
    brain.process("SOUND_HEARD");
    const second = guardSnapshot(first, source(brain));
    expect(second).not.toBe(first);
    expect(guardSnapshot(second, source(brain))).toBe(second);
  });

  it("does not reuse another guard's snapshot", () => {
    const first = guardSnapshot(undefined, source(new GuardBrain(), "G1"));
    expect(guardSnapshot(first, source(new GuardBrain(), "G2")).id).toBe("G2");
  });

  it("caps the history at the limit but keeps the true step numbers and ticks", () => {
    const brain = new GuardBrain();
    for (let i = 0; i < 120; i++) brain.process("PLAYER_LOST"); // self-loops in PATROL
    const snapshot = guardSnapshot(undefined, source(brain), 50);
    expect(snapshot.eventCount).toBe(120);
    expect(snapshot.history).toHaveLength(50);
    expect(snapshot.history[0]).toMatchObject({ step: 71, tick: 710 });
    expect(snapshot.history[49]).toMatchObject({ step: 120, tick: 1200 });
    // Consecutive, with no gaps.
    snapshot.history.forEach((t, i) => expect(t.step).toBe(71 + i));
  });

  it("uses HISTORY_DISPLAY_LIMIT by default", () => {
    const brain = new GuardBrain();
    for (let i = 0; i < HISTORY_DISPLAY_LIMIT + 5; i++) brain.process("PLAYER_LOST");
    expect(guardSnapshot(undefined, source(brain)).history).toHaveLength(HISTORY_DISPLAY_LIMIT);
  });

  it("does not cap the runner itself (the engine keeps the full history)", () => {
    const brain = new GuardBrain();
    for (let i = 0; i < 120; i++) brain.process("PLAYER_LOST");
    guardSnapshot(undefined, source(brain), 10);
    expect(brain.history).toHaveLength(120);
  });
});

describe("sameGuards", () => {
  it("is true only when every guard snapshot is the identical object", () => {
    const a = guardSnapshot(undefined, source(new GuardBrain(), "G1"));
    const b = guardSnapshot(undefined, source(new GuardBrain(), "G2"));
    expect(sameGuards([a, b], [a, b])).toBe(true);
    expect(sameGuards([a, b], [a, { ...b }])).toBe(false);
    expect(sameGuards([a], [a, b])).toBe(false);
  });
});
