import { describe, expect, it } from "vitest";
import { EPSILON } from "../../automata";
import { exampleLab, labReducer } from "./labModel";
import { LAB_PRESETS } from "./labPresets";
import { parseInputString, simulateLab } from "./labSimulation";

const preset = (id: string) => LAB_PRESETS.find((p) => p.id === id)!.build();
const idOf = (lab: ReturnType<typeof exampleLab>, name: string) => lab.states.find((s) => s.name === name)!.id;

describe("parseInputString", () => {
  it("treats empty text (or ε) as the empty string", () => {
    expect(parseInputString("", ["a"])).toEqual({ ok: true, symbols: [] });
    expect(parseInputString("  ε ", ["a"])).toEqual({ ok: true, symbols: [] });
  });

  it("splits single-character alphabets into characters", () => {
    expect(parseInputString("abba", ["a", "b"])).toEqual({ ok: true, symbols: ["a", "b", "b", "a"] });
  });

  it("splits on spaces or commas (needed for multi-character symbols)", () => {
    expect(parseInputString("PLAYER_SPOTTED, TIMER_EXPIRED", ["PLAYER_SPOTTED", "TIMER_EXPIRED"])).toEqual({
      ok: true,
      symbols: ["PLAYER_SPOTTED", "TIMER_EXPIRED"],
    });
    expect(parseInputString("a b  a", ["a", "b"])).toEqual({ ok: true, symbols: ["a", "b", "a"] });
  });

  it("reports symbols outside Σ", () => {
    const result = parseInputString("abc", ["a", "b"]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Not in Σ: "c"/);
  });
});

describe("simulateLab: DFA", () => {
  const lab = exampleLab(); // even number of a's

  it("handles the empty string: start state, accepted iff it is accepting", () => {
    const run = simulateLab(lab, [], 0);
    expect(run).toMatchObject({ runnable: true, kind: "DFA", accepted: true, current: [idOf(lab, "even")], live: [] });
  });

  it("highlights the single active state and the edge just taken, by id", () => {
    const run = simulateLab(lab, ["a", "b", "a"], 2);
    expect(run).toMatchObject({ runnable: true, accepted: false, current: [idOf(lab, "odd")] });
    if (run.runnable) {
      expect(run.live).toEqual([{ from: idOf(lab, "odd"), symbol: "b", to: idOf(lab, "odd") }]);
      expect(run.run.trace).toHaveLength(2); // only the read prefix
    }
  });

  it("accepts / rejects the whole string", () => {
    expect(simulateLab(lab, ["a", "b", "a"], 3)).toMatchObject({ accepted: true });
    expect(simulateLab(lab, ["a"], 1)).toMatchObject({ accepted: false });
  });

  it("refuses to run an invalid automaton, and explains why", () => {
    const broken = labReducer(lab, { type: "removeTransition", id: lab.transitions[0].id });
    expect(simulateLab(broken, ["a"], 1)).toEqual({ runnable: false, reason: expect.stringMatching(/Fix the 1 problem/) });
  });

  it("refuses input symbols that were removed from Σ", () => {
    const fewer = { ...lab, alphabet: ["a", "b"] };
    expect(simulateLab(fewer, ["c"], 0)).toMatchObject({ runnable: false });
  });
});

describe("simulateLab: NFA", () => {
  it("shows the whole active-state set, with ε-closure (guard NFA after 'sound')", () => {
    const lab = preset("guard-nfa");
    const run = simulateLab(lab, ["SOUND_HEARD"], 1);
    expect(run.runnable).toBe(true);
    if (run.runnable) {
      expect(run.current.map((id) => lab.states.find((s) => s.id === id)!.name)).toEqual(["PATROL", "ALERT", "SEARCH", "CHASE"]);
      expect(run.live.some((e) => e.symbol === EPSILON)).toBe(true);
      expect(run.accepted).toBe(false);
    }
  });

  it("accepts if any path ends in F; the empty set rejects", () => {
    const lab = preset("guard-nfa");
    expect(simulateLab(lab, ["SOUND_HEARD", "PLAYER_CAUGHT"], 2)).toMatchObject({ accepted: true });
    expect(simulateLab(lab, ["PLAYER_CAUGHT"], 1)).toMatchObject({ accepted: false, current: [] });
  });
});
