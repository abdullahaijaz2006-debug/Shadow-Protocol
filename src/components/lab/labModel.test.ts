import { describe, expect, it } from "vitest";
import { EPSILON } from "../../automata";
import {
  checkStateName,
  checkSymbol,
  checkTransition,
  emptyLab,
  exampleLab,
  LAB_CANVAS,
  labReducer,
  nextStateName,
  type LabAction,
  type LabAutomaton,
} from "./labModel";
import { labToAutomaton } from "./labValidation";

function apply(lab: LabAutomaton, ...actions: LabAction[]): LabAutomaton {
  return actions.reduce(labReducer, lab);
}

/** Two states q0 → q1 on "a", alphabet {a, b}. */
function twoStates(kind: "DFA" | "NFA" = "DFA"): LabAutomaton {
  let lab = apply(emptyLab(kind), { type: "addSymbol", symbol: "a" }, { type: "addSymbol", symbol: "b" });
  lab = apply(lab, { type: "addState", x: 100, y: 100 }, { type: "addState", x: 300, y: 100 });
  const [q0, q1] = lab.states.map((s) => s.id);
  return apply(lab, { type: "addTransition", from: q0, to: q1, symbol: "a" });
}

describe("states", () => {
  it("adds states with unique default names, stable ids, and the first one as start", () => {
    const lab = apply(emptyLab(), { type: "addState", x: 100, y: 100 }, { type: "addState", x: 200, y: 100 });
    expect(lab.states.map((s) => [s.id, s.name])).toEqual([
      ["s1", "q0"],
      ["s2", "q1"],
    ]);
    expect(lab.startId).toBe("s1");
  });

  it("never reuses an id, even after a delete", () => {
    let lab = apply(emptyLab(), { type: "addState", x: 100, y: 100 }, { type: "addState", x: 200, y: 100 });
    lab = apply(lab, { type: "deleteState", id: "s2" }, { type: "addState", x: 200, y: 100 });
    expect(lab.states.map((s) => s.id)).toEqual(["s1", "s3"]);
    expect(nextStateName(lab)).toBe("q2");
  });

  it("renaming keeps every transition, start and accepting mark (they refer to ids)", () => {
    let lab = twoStates();
    const [q0, q1] = lab.states.map((s) => s.id);
    lab = apply(lab, { type: "toggleAccepting", id: q1 }, { type: "renameState", id: q1, name: "ALERT" }, { type: "renameState", id: q0, name: "PATROL" });
    expect(lab.transitions).toEqual([{ id: expect.any(String), from: q0, to: q1, symbol: "a" }]);
    const formal = labToAutomaton(lab);
    expect(formal.transitions).toEqual([{ from: "PATROL", symbol: "a", to: "ALERT" }]);
    expect(formal.start).toBe("PATROL");
    expect(formal.accepting).toEqual(["ALERT"]);
  });

  it("refuses empty, reserved or duplicate names (document unchanged)", () => {
    const lab = twoStates();
    const q1 = lab.states[1].id;
    expect(checkStateName(lab, "  ")).toMatch(/needs a name/);
    expect(checkStateName(lab, EPSILON)).toMatch(/reserved/);
    expect(checkStateName(lab, "q0", q1)).toMatch(/already a state/);
    expect(checkStateName(lab, "q1", q1)).toBeNull(); // its own name is fine
    expect(labReducer(lab, { type: "renameState", id: q1, name: "q0" })).toBe(lab);
    expect(labReducer(lab, { type: "addState", x: 0, y: 0, name: "q0" })).toBe(lab);
  });

  it("moves states, keeping them inside the canvas", () => {
    const lab = twoStates();
    const id = lab.states[0].id;
    expect(labReducer(lab, { type: "moveState", id, x: 250.4, y: 330.6 }).states[0]).toMatchObject({ x: 250, y: 331 });
    const clamped = labReducer(lab, { type: "moveState", id, x: -500, y: 99_999 }).states[0];
    expect(clamped.x).toBeGreaterThan(0);
    expect(clamped.y).toBeLessThan(LAB_CANVAS.height);
  });

  it("deleting a state removes its transitions and its start / accepting marks", () => {
    let lab = twoStates();
    const [q0, q1] = lab.states.map((s) => s.id);
    lab = apply(lab, { type: "toggleAccepting", id: q0 }, { type: "addTransition", from: q1, to: q1, symbol: "b" });
    lab = labReducer(lab, { type: "deleteState", id: q0 });
    expect(lab.states.map((s) => s.id)).toEqual([q1]);
    expect(lab.transitions.map((t) => [t.from, t.symbol, t.to])).toEqual([[q1, "b", q1]]);
    expect(lab.startId).toBeNull();
    expect(lab.acceptingIds).toEqual([]);
  });

  it("sets the start state and toggles accepting states", () => {
    let lab = twoStates();
    const q1 = lab.states[1].id;
    lab = apply(lab, { type: "setStart", id: q1 }, { type: "toggleAccepting", id: q1 });
    expect(lab.startId).toBe(q1);
    expect(lab.acceptingIds).toEqual([q1]);
    expect(labReducer(lab, { type: "toggleAccepting", id: q1 }).acceptingIds).toEqual([]);
    expect(labReducer(lab, { type: "setStart", id: "nope" })).toBe(lab);
  });
});

describe("alphabet", () => {
  it("adds trimmed symbols and refuses empty, ε and duplicates", () => {
    const lab = labReducer(emptyLab(), { type: "addSymbol", symbol: " PLAYER_SPOTTED " });
    expect(lab.alphabet).toEqual(["PLAYER_SPOTTED"]);
    expect(checkSymbol(lab, "")).toMatch(/empty/);
    expect(checkSymbol(lab, EPSILON)).toMatch(/not a symbol/);
    expect(checkSymbol(lab, "a b")).toMatch(/spaces or commas/);
    expect(checkSymbol(lab, "a,b")).toMatch(/spaces or commas/);
    expect(checkSymbol(lab, " PLAYER_LOST_2 ")).toBeNull(); // trimmed, then fine
    expect(checkSymbol(lab, "PLAYER_SPOTTED")).toMatch(/already/);
    expect(labReducer(lab, { type: "addSymbol", symbol: "PLAYER_SPOTTED" })).toBe(lab);
  });

  it("removing a symbol keeps the transitions that use it (validation reports them)", () => {
    const lab = labReducer(twoStates(), { type: "removeSymbol", symbol: "a" });
    expect(lab.alphabet).toEqual(["b"]);
    expect(lab.transitions).toHaveLength(1);
  });
});

describe("transitions", () => {
  it("adds and removes transitions, including self-loops", () => {
    let lab = twoStates();
    const [q0] = lab.states.map((s) => s.id);
    lab = labReducer(lab, { type: "addTransition", from: q0, to: q0, symbol: "b" });
    expect(lab.transitions.map((t) => [t.from, t.symbol, t.to])).toContainEqual([q0, "b", q0]);
    lab = labReducer(lab, { type: "removeTransition", id: lab.transitions[0].id });
    expect(lab.transitions).toHaveLength(1);
  });

  it("refuses symbols outside Σ, missing states and exact duplicates", () => {
    const lab = twoStates();
    const [q0, q1] = lab.states.map((s) => s.id);
    expect(checkTransition(lab, q0, q1, "c")).toMatch(/not in Σ/);
    expect(checkTransition(lab, q0, "s99", "a")).toMatch(/existing states/);
    expect(checkTransition(lab, q0, q1, "a")).toMatch(/already exists/);
    expect(labReducer(lab, { type: "addTransition", from: q0, to: q1, symbol: "a" })).toBe(lab);
  });

  it("allows a second target for the same (state, symbol) even in a DFA, so validation can flag it", () => {
    const lab = twoStates();
    const [q0] = lab.states.map((s) => s.id);
    expect(checkTransition(lab, q0, q0, "a")).toBeNull();
  });

  it("allows ε-transitions only in NFA mode", () => {
    const dfa = twoStates("DFA");
    const nfa = twoStates("NFA");
    const [d0, d1] = dfa.states.map((s) => s.id);
    const [n0, n1] = nfa.states.map((s) => s.id);
    expect(checkTransition(dfa, d0, d1, EPSILON)).toMatch(/NFA mode/);
    expect(checkTransition(nfa, n0, n1, EPSILON)).toBeNull();
  });

  it("switching an NFA with ε-edges to DFA mode keeps the edges (validation reports them)", () => {
    let lab = twoStates("NFA");
    const [n0, n1] = lab.states.map((s) => s.id);
    lab = apply(lab, { type: "addTransition", from: n1, to: n0, symbol: EPSILON }, { type: "setKind", kind: "DFA" });
    expect(lab.kind).toBe("DFA");
    expect(lab.transitions.some((t) => t.symbol === EPSILON)).toBe(true);
  });
});

describe("misc", () => {
  it("renames the automaton (ignoring blank names) and can replace the whole document", () => {
    const lab = labReducer(emptyLab(), { type: "setName", name: " Guard " });
    expect(lab.name).toBe("Guard");
    expect(labReducer(lab, { type: "setName", name: " " })).toBe(lab);
    const other = exampleLab();
    expect(labReducer(lab, { type: "replace", lab: other })).toBe(other);
  });
});
