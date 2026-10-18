import { describe, expect, it } from "vitest";
import { acceptsDFA, EPSILON, runNFA, type DFA, type NFA } from "../../automata";
import { emptyLab, exampleLab, labReducer, type LabAction, type LabAutomaton } from "./labModel";
import { labToAutomaton, labToGraphAutomaton, missingStateName, validateLab } from "./labValidation";

function apply(lab: LabAutomaton, ...actions: LabAction[]): LabAutomaton {
  return actions.reduce(labReducer, lab);
}
const codes = (lab: LabAutomaton) => validateLab(lab).map((issue) => issue.code);

describe("validateLab uses the engine's validation", () => {
  it("finds nothing wrong with the example DFA", () => {
    expect(validateLab(exampleLab())).toEqual([]);
  });

  it("the converted example runs on the engine (it really is the even-a's DFA)", () => {
    const dfa = labToAutomaton(exampleLab()) as DFA;
    expect(acceptsDFA(dfa, [])).toBe(true);
    expect(acceptsDFA(dfa, ["a", "b", "a"])).toBe(true);
    expect(acceptsDFA(dfa, ["a", "b"])).toBe(false);
  });

  it("reports an incomplete DFA, pointing at the state that lacks a transition", () => {
    const lab = exampleLab();
    const odd = lab.states[1];
    const missing = labReducer(lab, { type: "removeTransition", id: lab.transitions.find((t) => t.from === odd.id && t.symbol === "b")!.id });
    expect(validateLab(missing)).toEqual([
      expect.objectContaining({ code: "MISSING_TRANSITION", stateIds: [odd.id], message: expect.stringContaining("δ(odd, b)") }),
    ]);
  });

  it("reports duplicate deterministic transitions, pointing at both edges", () => {
    const lab = exampleLab();
    const [even, odd] = lab.states.map((s) => s.id);
    const nondeterministic = labReducer(lab, { type: "addTransition", from: even, to: even, symbol: "a" });
    const [issue] = validateLab(nondeterministic);
    expect(issue.code).toBe("DUPLICATE_TRANSITION");
    const flagged = nondeterministic.transitions.filter((t) => issue.transitionIds.includes(t.id));
    expect(flagged.map((t) => [t.from, t.symbol, t.to])).toEqual([
      [even, "a", odd],
      [even, "a", even],
    ]);
  });

  it("reports transitions whose symbol is no longer in Σ", () => {
    const lab = labReducer(exampleLab(), { type: "removeSymbol", symbol: "b" });
    const issues = validateLab(lab);
    expect(issues.every((i) => i.code === "UNKNOWN_SYMBOL")).toBe(true);
    expect(issues.flatMap((i) => i.transitionIds)).toHaveLength(2);
  });

  it("reports references to states that do not exist (e.g. from a hand-edited file)", () => {
    const lab = exampleLab();
    const broken: LabAutomaton = { ...lab, transitions: [...lab.transitions, { id: "t99", from: lab.states[0].id, to: "s42", symbol: "a" }] };
    const issues = validateLab(broken);
    expect(issues).toContainEqual(expect.objectContaining({ code: "UNKNOWN_STATE", transitionIds: ["t99"] }));
    const converted = labToAutomaton(broken).transitions;
    expect(converted[converted.length - 1].to).toBe(missingStateName("s42"));
    // The drawing simply leaves the broken edge out.
    expect(labToGraphAutomaton(broken).transitions).toHaveLength(lab.transitions.length);
  });

  it("asks for a start state when none is chosen", () => {
    const lab = labReducer(exampleLab(), { type: "setStart", id: null });
    expect(validateLab(lab)).toEqual([expect.objectContaining({ code: "NO_START", message: "No start state q₀ has been chosen." })]);
  });

  it("reports an empty automaton", () => {
    expect(codes(emptyLab())).toEqual(["EMPTY_STATES", "NO_START"]);
  });

  it("reports ε-transitions in DFA mode", () => {
    let lab = labReducer(exampleLab(), { type: "setKind", kind: "NFA" });
    const [even, odd] = lab.states.map((s) => s.id);
    lab = apply(lab, { type: "addTransition", from: even, to: odd, symbol: EPSILON }, { type: "setKind", kind: "DFA" });
    expect(validateLab(lab)).toEqual([expect.objectContaining({ code: "EPSILON_IN_DFA", stateIds: [even] })]);
  });

  it("reports duplicate state names (possible only in imported documents)", () => {
    const lab = exampleLab();
    const dup: LabAutomaton = { ...lab, states: lab.states.map((s) => ({ ...s, name: "same" })) };
    expect(codes(dup)).toContain("DUPLICATE_STATE");
  });
});

describe("NFA mode", () => {
  /** q0 --a--> {q0, q1}, q1 --ε--> q2, nothing else (an incomplete, nondeterministic machine). */
  function nfaLab(): LabAutomaton {
    let lab = apply(emptyLab("NFA"), { type: "addSymbol", symbol: "a" });
    for (const x of [100, 300, 500]) lab = labReducer(lab, { type: "addState", x, y: 200 });
    const [q0, q1, q2] = lab.states.map((s) => s.id);
    return apply(
      lab,
      { type: "addTransition", from: q0, to: q0, symbol: "a" },
      { type: "addTransition", from: q0, to: q1, symbol: "a" },
      { type: "addTransition", from: q1, to: q2, symbol: EPSILON },
      { type: "toggleAccepting", id: q2 },
    );
  }

  it("allows missing transitions, several targets and ε-transitions", () => {
    expect(validateLab(nfaLab())).toEqual([]);
  });

  it("converts to an engine NFA that simulates correctly (with ε-closure)", () => {
    const nfa = labToAutomaton(nfaLab()) as NFA;
    expect(nfa.kind).toBe("NFA");
    expect(runNFA(nfa, ["a"])).toMatchObject({ finalStates: ["q0", "q1", "q2"], accepted: true });
  });

  it("the same machine in DFA mode is reported as nondeterministic, incomplete and using ε", () => {
    const lab = labReducer(nfaLab(), { type: "setKind", kind: "DFA" });
    expect(new Set(codes(lab))).toEqual(new Set(["DUPLICATE_TRANSITION", "MISSING_TRANSITION", "EPSILON_IN_DFA"]));
  });
});

describe("labToGraphAutomaton", () => {
  it("draws by stable id, so names never matter to the graph", () => {
    const lab = labReducer(exampleLab(), { type: "renameState", id: "s1", name: "renamed" });
    const graph = labToGraphAutomaton(lab);
    expect(graph.states).toEqual(lab.states.map((s) => s.id));
    expect(graph.start).toBe(lab.startId);
    expect(graph.transitions.every((t) => lab.states.some((s) => s.id === t.from))).toBe(true);
  });
});
