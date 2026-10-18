import { describe, expect, it } from "vitest";
import { completion, INITIAL_PROGRESS, parseProgress, progressReducer } from "./progress";

const PAGES = ["intro", "dfa", "nfa"];

describe("progressReducer", () => {
  it("Next and Previous move one page and mark pages visited", () => {
    let p = progressReducer(INITIAL_PROGRESS, { type: "next" }, PAGES);
    expect(p).toMatchObject({ current: 1, visited: ["dfa"] });
    p = progressReducer(p, { type: "next" }, PAGES);
    p = progressReducer(p, { type: "previous" }, PAGES);
    expect(p).toMatchObject({ current: 1, visited: ["dfa", "nfa"] });
  });

  it("never leaves the first or last page", () => {
    expect(progressReducer(INITIAL_PROGRESS, { type: "previous" }, PAGES).current).toBe(0);
    expect(progressReducer({ ...INITIAL_PROGRESS, current: 2 }, { type: "next" }, PAGES).current).toBe(2);
    expect(progressReducer(INITIAL_PROGRESS, { type: "goto", index: 99 }, PAGES).current).toBe(2);
  });

  it("goto jumps to a page (e.g. from the module list)", () => {
    expect(progressReducer(INITIAL_PROGRESS, { type: "goto", index: 2 }, PAGES)).toMatchObject({ current: 2, visited: ["nfa"] });
  });

  it("records solved challenges once", () => {
    let p = progressReducer(INITIAL_PROGRESS, { type: "solved", challengeId: "c1" }, PAGES);
    p = progressReducer(p, { type: "solved", challengeId: "c1" }, PAGES);
    expect(p.solved).toEqual(["c1"]);
  });
});

describe("completion / parseProgress", () => {
  it("counts the fraction of pages visited", () => {
    expect(completion({ ...INITIAL_PROGRESS, visited: ["intro", "nfa"] }, PAGES)).toBeCloseTo(2 / 3);
  });

  it("restores saved progress and drops unknown pages", () => {
    const saved = JSON.stringify({ current: 1, visited: ["intro", "gone"], solved: ["c1", 3] });
    expect(parseProgress(saved, PAGES)).toEqual({ current: 1, visited: ["intro"], solved: ["c1"] });
  });

  it("starts fresh on missing or broken data", () => {
    expect(parseProgress(null, PAGES)).toEqual({ current: 0, visited: ["intro"], solved: [] });
    expect(parseProgress("{nope", PAGES).current).toBe(0);
    expect(parseProgress(JSON.stringify({ current: 50 }), PAGES).current).toBe(2);
  });
});
