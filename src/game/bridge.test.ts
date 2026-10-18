import { describe, expect, it, vi } from "vitest";
import { GameBridge, INITIAL_SNAPSHOT, type GameSnapshot } from "./bridge";

const SNAPSHOT: GameSnapshot = { ...INITIAL_SNAPSHOT, ready: true, paused: true, tick: 5 };

describe("GameBridge", () => {
  it("starts with the initial snapshot", () => {
    expect(new GameBridge().getSnapshot()).toBe(INITIAL_SNAPSHOT);
  });

  it("returns the same snapshot object until a new one is published (useSyncExternalStore contract)", () => {
    const bridge = new GameBridge();
    bridge.publish(SNAPSHOT);
    expect(bridge.getSnapshot()).toBe(bridge.getSnapshot());
    expect(bridge.getSnapshot()).toBe(SNAPSHOT);
  });

  it("notifies subscribers on publish, and stops after unsubscribe", () => {
    const bridge = new GameBridge();
    const listener = vi.fn();
    const unsubscribe = bridge.subscribe(listener);
    bridge.publish(SNAPSHOT);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    bridge.publish(INITIAL_SNAPSHOT);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("queues commands in order and hands each one over exactly once", () => {
    const bridge = new GameBridge();
    bridge.send({ type: "pause" });
    bridge.send({ type: "step" });
    bridge.send({ type: "step" });
    expect(bridge.takeCommands()).toEqual([{ type: "pause" }, { type: "step" }, { type: "step" }]);
    expect(bridge.takeCommands()).toEqual([]);
  });

  it("works with detached methods (as passed to React hooks and props)", () => {
    const bridge = new GameBridge();
    const { subscribe, getSnapshot, send } = bridge;
    const listener = vi.fn();
    subscribe(listener);
    send({ type: "reset" });
    bridge.publish(SNAPSHOT);
    expect(getSnapshot()).toBe(SNAPSHOT);
    expect(listener).toHaveBeenCalled();
    expect(bridge.takeCommands()).toEqual([{ type: "reset" }]);
  });
});
