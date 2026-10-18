import { describe, expect, it, vi } from "vitest";
import { emptyLab, exampleLab } from "./labModel";
import { LabStore } from "./labStore";

describe("LabStore", () => {
  it("starts with the example document and no external load", () => {
    const store = new LabStore();
    expect(store.getSnapshot().lab).toEqual(exampleLab());
    expect(store.getSnapshot().load.version).toBe(0);
  });

  it("applies edits through the Lab reducer and notifies subscribers", () => {
    const store = new LabStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.dispatch({ type: "setName", name: "Mine" });
    expect(store.getSnapshot().lab.name).toBe("Mine");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("ignores refused edits (no new snapshot, no notification)", () => {
    const store = new LabStore();
    const listener = vi.fn();
    store.subscribe(listener);
    const before = store.getSnapshot();
    store.dispatch({ type: "addSymbol", symbol: "a" }); // already in Σ
    expect(store.getSnapshot()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
  });

  it("load() replaces the document and remembers the previous one for undo", () => {
    const store = new LabStore();
    const original = store.getSnapshot().lab;
    const next = emptyLab("NFA", "Challenge");
    store.load(next, "Challenge 1");
    expect(store.getSnapshot()).toEqual({ lab: next, load: { version: 1, previous: original, label: "Challenge 1" } });
    store.load(emptyLab(), "again");
    expect(store.getSnapshot().load.version).toBe(2);
  });
});
