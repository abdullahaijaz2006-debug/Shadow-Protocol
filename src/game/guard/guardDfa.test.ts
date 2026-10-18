import { describe, expect, it } from "vitest";
import { acceptsDFA, runDFA, validateDFA } from "../../automata";
import { allStrings } from "../../automata/testHelpers";
import { GuardBrain } from "./GuardBrain";
import { GUARD_DFA, GUARD_STATES, GUARD_SYMBOLS, GUARD_TRANSITIONS, type GuardSymbol } from "./guardDfa";

function finalState(input: GuardSymbol[]): string {
  return runDFA(GUARD_DFA, input).finalState;
}

describe("GUARD_DFA: the 5-tuple", () => {
  it("is a valid DFA for the Milestone 2 engine (complete and deterministic)", () => {
    expect(validateDFA(GUARD_DFA)).toEqual([]);
  });

  it("has exactly one transition for every (state, symbol) pair: |δ| = |Q| × |Σ| = 25", () => {
    expect(GUARD_DFA.transitions).toHaveLength(GUARD_STATES.length * GUARD_SYMBOLS.length);
    for (const state of GUARD_STATES) {
      for (const symbol of GUARD_SYMBOLS) {
        const edges = GUARD_DFA.transitions.filter((edge) => edge.from === state && edge.symbol === symbol);
        expect(edges, `δ(${state}, ${symbol})`).toHaveLength(1);
        expect(edges[0].to).toBe(GUARD_TRANSITIONS[state][symbol]);
      }
    }
  });

  it("starts in PATROL and has F = {CAPTURE}", () => {
    expect(GUARD_DFA.start).toBe("PATROL");
    expect(GUARD_DFA.accepting).toEqual(["CAPTURE"]);
  });

  it("can reach every state from PATROL", () => {
    const reached = new Set(allStrings(GUARD_SYMBOLS, 4).map((input) => finalState(input as GuardSymbol[])));
    expect([...reached].sort()).toEqual([...GUARD_STATES].sort());
  });
});

describe("GUARD_DFA: transitions", () => {
  it.each([
    [[], "PATROL"],
    [["PLAYER_SPOTTED"], "ALERT"],
    [["PLAYER_SPOTTED", "TIMER_EXPIRED"], "CHASE"],
    [["PLAYER_SPOTTED", "TIMER_EXPIRED", "PLAYER_LOST"], "SEARCH"],
    [["PLAYER_SPOTTED", "TIMER_EXPIRED", "PLAYER_LOST", "TIMER_EXPIRED"], "PATROL"],
    [["PLAYER_SPOTTED", "TIMER_EXPIRED", "PLAYER_LOST", "PLAYER_SPOTTED"], "CHASE"],
    [["PLAYER_SPOTTED", "TIMER_EXPIRED", "PLAYER_CAUGHT"], "CAPTURE"],
    [["SOUND_HEARD"], "SEARCH"],
    [["SOUND_HEARD", "SOUND_HEARD"], "SEARCH"],
    [["SOUND_HEARD", "TIMER_EXPIRED"], "PATROL"],
    [["SOUND_HEARD", "PLAYER_SPOTTED"], "CHASE"],
    [["PLAYER_SPOTTED", "PLAYER_LOST"], "SEARCH"],
  ] as [GuardSymbol[], string][])("%j → %s", (input, expected) => {
    expect(finalState(input)).toBe(expected);
  });

  it("gives TIMER_EXPIRED a different meaning in each state", () => {
    expect(GUARD_TRANSITIONS.ALERT.TIMER_EXPIRED).toBe("CHASE");
    expect(GUARD_TRANSITIONS.SEARCH.TIMER_EXPIRED).toBe("PATROL");
    expect(GUARD_TRANSITIONS.PATROL.TIMER_EXPIRED).toBe("PATROL");
  });

  it("only captures from CHASE: PLAYER_CAUGHT is ignored in every other non-final state", () => {
    expect(GUARD_STATES.filter((state) => GUARD_TRANSITIONS[state].PLAYER_CAUGHT === "CAPTURE")).toEqual([
      "CHASE",
      "CAPTURE",
    ]);
  });

  it("CAPTURE is absorbing: every symbol loops back to it", () => {
    for (const symbol of GUARD_SYMBOLS) expect(GUARD_TRANSITIONS.CAPTURE[symbol]).toBe("CAPTURE");
  });
});

describe("GUARD_DFA: operational states vs. accepting states", () => {
  it("only CAPTURE is accepting; chasing is not 'accepted'", () => {
    expect(acceptsDFA(GUARD_DFA, ["PLAYER_SPOTTED", "TIMER_EXPIRED"])).toBe(false);
    expect(acceptsDFA(GUARD_DFA, ["PLAYER_SPOTTED", "TIMER_EXPIRED", "PLAYER_CAUGHT"])).toBe(true);
  });

  it("L(M) ⊆ Σ*·PLAYER_SPOTTED·Σ*·PLAYER_CAUGHT·Σ* (no capture without first being seen)", () => {
    for (const input of allStrings(GUARD_SYMBOLS, 5)) {
      if (!acceptsDFA(GUARD_DFA, input)) continue;
      const spotted = input.indexOf("PLAYER_SPOTTED");
      expect(spotted, input.join(" ")).toBeGreaterThanOrEqual(0);
      expect(input.indexOf("PLAYER_CAUGHT", spotted), input.join(" ")).toBeGreaterThan(spotted);
    }
  });

  it("once accepted, every extension stays accepted (CAPTURE is a final, absorbing state)", () => {
    const captured: GuardSymbol[] = ["PLAYER_SPOTTED", "TIMER_EXPIRED", "PLAYER_CAUGHT"];
    for (const suffix of allStrings(GUARD_SYMBOLS, 3)) {
      expect(acceptsDFA(GUARD_DFA, [...captured, ...suffix])).toBe(true);
    }
  });
});

describe("GuardBrain", () => {
  it("starts in PATROL with an empty history", () => {
    const brain = new GuardBrain();
    expect(brain.state).toBe("PATROL");
    expect(brain.history).toEqual([]);
    expect(brain.lastRecord).toBeNull();
    expect(brain.isAccepting).toBe(false);
  });

  it("records every processed event in the runner's transition history, including self-loops", () => {
    const brain = new GuardBrain();
    brain.process("PLAYER_LOST"); // ignored in PATROL, but still recorded
    brain.process("PLAYER_SPOTTED");
    brain.process("TIMER_EXPIRED");
    expect(brain.state).toBe("CHASE");
    expect(brain.history.map((record) => [record.from[0], record.symbol, record.to[0]])).toEqual([
      ["PATROL", "PLAYER_LOST", "PATROL"],
      ["PATROL", "PLAYER_SPOTTED", "ALERT"],
      ["ALERT", "TIMER_EXPIRED", "CHASE"],
    ]);
    expect(brain.lastRecord).toMatchObject({ step: 3, symbol: "TIMER_EXPIRED" });
  });

  it("agrees with runDFA on the same input (the brain is just the DFA)", () => {
    const input: GuardSymbol[] = ["SOUND_HEARD", "PLAYER_SPOTTED", "PLAYER_LOST", "TIMER_EXPIRED"];
    const brain = new GuardBrain();
    for (const symbol of input) brain.process(symbol);
    expect(brain.state).toBe(runDFA(GUARD_DFA, input).finalState);
  });

  it("is accepting after a capture", () => {
    const brain = new GuardBrain();
    for (const symbol of ["PLAYER_SPOTTED", "TIMER_EXPIRED", "PLAYER_CAUGHT"] as const) brain.process(symbol);
    expect(brain.state).toBe("CAPTURE");
    expect(brain.isAccepting).toBe(true);
  });
});
