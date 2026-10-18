import { describe, expect, it } from "vitest";
import { EPSILON } from "../../automata";
import {
  compare,
  comparisonReducer,
  COMPARISON_CONVERSION,
  dfaStateAlias,
  INITIAL_COMPARISON,
  PRESETS,
  type ComparisonState,
} from "./comparisonModel";

const STATE: ComparisonState = { input: ["PLAYER_SPOTTED", "TIMER_EXPIRED", "PLAYER_CAUGHT"], position: 0, playing: false };

describe("comparisonReducer: step, pause, resume and reset", () => {
  it("step reads exactly one more symbol, and stops at the end", () => {
    let state = comparisonReducer(STATE, { type: "step" });
    expect(state.position).toBe(1);
    state = comparisonReducer(comparisonReducer(state, { type: "step" }), { type: "step" });
    expect(state.position).toBe(3);
    expect(comparisonReducer(state, { type: "step" }).position).toBe(3);
  });

  it("play starts auto-advancing; pause stops it without moving", () => {
    const playing = comparisonReducer(STATE, { type: "play" });
    expect(playing.playing).toBe(true);
    const paused = comparisonReducer(comparisonReducer(playing, { type: "step" }), { type: "pause" });
    expect(paused).toEqual({ ...STATE, position: 1, playing: false });
  });

  it("playing stops by itself after the last symbol", () => {
    let state = comparisonReducer(STATE, { type: "play" });
    for (let i = 0; i < 3; i++) state = comparisonReducer(state, { type: "step" });
    expect(state).toMatchObject({ position: 3, playing: false });
    expect(comparisonReducer(state, { type: "play" }).playing).toBe(false); // nothing left to play
  });

  it("reset goes back to the empty prefix but keeps the input", () => {
    const moved = comparisonReducer(comparisonReducer(STATE, { type: "step" }), { type: "play" });
    expect(comparisonReducer(moved, { type: "reset" })).toEqual({ ...STATE, position: 0, playing: false });
  });

  it("append adds an unread symbol; removeLast removes it (and steps back if it was read)", () => {
    const appended = comparisonReducer(STATE, { type: "append", symbol: "SOUND_HEARD" });
    expect(appended.input).toHaveLength(4);
    expect(appended.position).toBe(0);
    const atEnd: ComparisonState = { ...STATE, position: 3 };
    expect(comparisonReducer(atEnd, { type: "removeLast" })).toMatchObject({ position: 2, input: STATE.input.slice(0, 2) });
  });

  it("clear and load replace the input and start from the beginning", () => {
    expect(comparisonReducer(STATE, { type: "clear" })).toEqual({ input: [], position: 0, playing: false });
    expect(comparisonReducer({ ...STATE, position: 2 }, { type: "load", input: ["SOUND_HEARD"] })).toEqual({
      input: ["SOUND_HEARD"],
      position: 0,
      playing: false,
    });
  });

  it("starts with a preset loaded and nothing read", () => {
    expect(INITIAL_COMPARISON.position).toBe(0);
    expect(INITIAL_COMPARISON.input.length).toBeGreaterThan(0);
  });
});

describe("compare: both machines read the same prefix", () => {
  it("before any input: NFA in ECLOSE({q₀}), DFA in D0, both reject ε", () => {
    const result = compare(STATE.input, 0);
    expect(result.consumed).toEqual([]);
    expect(result.nfa.finalStates).toEqual(["PATROL"]);
    expect(dfaStateAlias(result.dfa.finalState)).toBe("D0");
    expect(result.nfa.accepted).toBe(false);
    expect(result.dfa.accepted).toBe(false);
    expect(result.nfaLive).toEqual([]);
    expect(result.dfaLive).toEqual([]);
  });

  it("after each step, the DFA's subset equals the NFA's active set", () => {
    for (let position = 0; position <= STATE.input.length; position++) {
      const result = compare(STATE.input, position);
      expect(result.consumed).toHaveLength(position);
      expect(result.dfa.trace).toHaveLength(position);
      expect(result.nfa.trace).toHaveLength(position);
      expect(result.dfaSubset).toEqual(result.nfa.finalStates);
      expect(result.consistent).toBe(true);
    }
  });

  it("reports the NFA's fired edges including ε-edges, and the DFA's single edge", () => {
    const result = compare(STATE.input, 1); // spotted
    expect(result.nfaLive).toEqual([
      { from: "PATROL", symbol: "PLAYER_SPOTTED", to: "ALERT" },
      { from: "ALERT", symbol: EPSILON, to: "CHASE" },
    ]);
    expect(result.dfaLive).toEqual([{ from: "{PATROL}", symbol: "PLAYER_SPOTTED", to: "{ALERT,CHASE}" }]);
  });

  it.each(PRESETS.map((preset) => [preset.label, preset] as const))("preset '%s' gives the documented verdict in both machines", (_label, preset) => {
    const result = compare(preset.input, preset.input.length);
    expect(result.nfa.accepted).toBe(preset.expectAccepted);
    expect(result.dfa.accepted).toBe(preset.expectAccepted);
    expect(result.consistent).toBe(true);
  });
});

describe("dfaStateAlias", () => {
  it("names the subset DFA's states D0, D1, … in construction order, D0 being the start", () => {
    const { dfa } = COMPARISON_CONVERSION;
    expect(dfa.states.map(dfaStateAlias)).toEqual(dfa.states.map((_s, i) => `D${i}`));
    expect(dfaStateAlias(dfa.start)).toBe("D0");
  });
});
