import { describe, expect, it } from "vitest";
import { acceptsDFA, acceptsNFA, EPSILON, validate, type Automaton, type DFA, type NFA } from "../../automata";
import { allStrings } from "../../automata/testHelpers";
import { labReducer, type LabAction, type LabAutomaton } from "../lab/labModel";
import { automatonToLab } from "../lab/labPresets";
import { CHALLENGES, challengeStarter, checkChallenge, type Challenge } from "./challenges";

const byId = (id: string) => CHALLENGES.find((c) => c.id === id)!;
const accepts = (a: Automaton, input: readonly string[]) => (a.kind === "DFA" ? acceptsDFA(a as DFA, input) : acceptsNFA(a as NFA, input));

/** The language each challenge describes in words, as a plain predicate. */
const SPEC: Record<string, (input: readonly string[]) => boolean> = {
  "ends-01": (w) => w.join("").endsWith("01"),
  "guard-alarm": (w) => w.some((s, i) => s === "PLAYER_SPOTTED" && w[i + 1] === "PLAYER_SPOTTED"),
  "contains-aba": (w) => w.join("").includes("aba"),
  "second-last-1": (w) => w.length >= 2 && w[w.length - 2] === "1",
};

describe("CHALLENGES: definitions are mathematically right", () => {
  it("has at least three, numbered in order of difficulty", () => {
    expect(CHALLENGES.length).toBeGreaterThanOrEqual(3);
    expect(CHALLENGES.map((c) => c.number)).toEqual(CHALLENGES.map((_c, i) => i + 1));
    const rank = { Easy: 0, Medium: 1, Hard: 2 };
    for (let i = 1; i < CHALLENGES.length; i++) expect(rank[CHALLENGES[i].difficulty]).toBeGreaterThanOrEqual(rank[CHALLENGES[i - 1].difficulty]);
  });

  it.each(CHALLENGES.map((c) => [c.id, c] as const))("%s: the reference automaton is valid and matches the description", (id, c) => {
    expect(validate(c.reference)).toEqual([]);
    expect(c.reference.alphabet).toEqual(c.alphabet);
    for (const input of allStrings(c.alphabet, 8)) expect(accepts(c.reference, input), input.join(" ")).toBe(SPEC[id](input));
  });

  it.each(CHALLENGES.map((c) => [c.id, c] as const))("%s: every hand-picked test agrees with the description, and there are negative cases", (id, c) => {
    for (const test of c.tests) expect(SPEC[id](test.input), test.input.join(" ")).toBe(test.accept);
    expect(c.tests.some((test) => !test.accept)).toBe(true);
    expect(c.tests.some((test) => test.accept)).toBe(true);
  });

  it("the NFA challenge's reference fits its own state limit", () => {
    const c = byId("second-last-1");
    expect(c.reference.states.length).toBeLessThanOrEqual(c.maxStates!);
  });
});

describe("challengeStarter", () => {
  it("is an empty document of the right kind with Σ filled in", () => {
    const lab = challengeStarter(byId("ends-01"));
    expect(lab).toMatchObject({ kind: "DFA", alphabet: ["0", "1"], states: [], transitions: [] });
    expect(challengeStarter(byId("second-last-1")).kind).toBe("NFA");
  });
});

/** Builds a Lab document by applying edits to a challenge's starter (as a user would in the Lab). */
function build(c: Challenge, states: string[], edges: [string, string, string][], accepting: string[]): LabAutomaton {
  let lab = challengeStarter(c);
  states.forEach((name, i) => (lab = labReducer(lab, { type: "addState", x: 100 + i * 150, y: 200, name })));
  const id = (name: string) => lab.states.find((s) => s.name === name)!.id;
  const actions: LabAction[] = [
    ...edges.map(([from, symbol, to]): LabAction => ({ type: "addTransition", from: id(from), symbol, to: id(to) })),
    ...accepting.map((name): LabAction => ({ type: "toggleAccepting", id: id(name) })),
  ];
  return actions.reduce(labReducer, lab);
}

describe("checkChallenge: correct answers pass", () => {
  it.each(CHALLENGES.map((c) => [c.id, c] as const))("%s: the reference itself, loaded into the Lab", (_id, c) => {
    const report = checkChallenge(c, { ...automatonToLab(c.reference, "mine") });
    expect(report.status).toBe("passed");
    expect(report.tests.every((r) => r.pass)).toBe(true);
    expect(report.exhaustive).toMatchObject({ counterexample: null, maxLength: c.exhaustiveLength });
  });

  it("a differently built but equivalent DFA (extra redundant state) passes 'ends in 01'", () => {
    const c = byId("ends-01");
    const lab = build(
      c,
      ["a", "b", "c", "a2"],
      [["a", "0", "b"], ["a", "1", "a2"], ["a2", "0", "b"], ["a2", "1", "a"], ["b", "0", "b"], ["b", "1", "c"], ["c", "0", "b"], ["c", "1", "a"]],
      ["c"],
    );
    expect(checkChallenge(c, lab).status).toBe("passed");
  });

  it("an NFA with an ε-transition passes 'second-to-last is 1' within 3 states", () => {
    const c = byId("second-last-1");
    const lab = build(c, ["p", "q", "r"], [["p", "0", "p"], ["p", "1", "p"], ["p", "1", "q"], ["q", "0", "r"], ["q", "1", "r"]], ["r"]);
    expect(checkChallenge(c, lab).status).toBe("passed");
    // Adding a harmless ε-loop back to itself keeps the same language.
    const withEps = labReducer(lab, { type: "addTransition", from: lab.states[2].id, to: lab.states[2].id, symbol: EPSILON });
    expect(checkChallenge(c, withEps).status).toBe("passed");
  });
});

describe("checkChallenge: incorrect answers are caught", () => {
  const c = byId("ends-01");

  it("a DFA that accepts the wrong language fails, with the failing tests and a shortest counterexample", () => {
    // Accepts strings ending in 1 instead of 01.
    const lab = build(c, ["x", "y"], [["x", "0", "x"], ["x", "1", "y"], ["y", "0", "x"], ["y", "1", "y"]], ["y"]);
    const report = checkChallenge(c, lab);
    expect(report.status).toBe("wrong");
    expect(report.tests.filter((r) => !r.pass).map((r) => r.input.join(""))).toEqual(expect.arrayContaining(["1", "011"]));
    expect(report.exhaustive).toMatchObject({ counterexample: ["1"], shouldAccept: false });
  });

  it("a machine that fails only on a string not in the hand-picked tests is still caught by the exhaustive check", () => {
    // 'Contains aba', except it also accepts strings ending in abb (e.g. "abb"), which no hand-picked test covers.
    const aba = byId("contains-aba");
    const almost = build(
      aba,
      ["n", "a", "ab", "abb", "done"],
      [
        ["n", "a", "a"], ["n", "b", "n"], ["a", "a", "a"], ["a", "b", "ab"], ["ab", "a", "done"], ["ab", "b", "abb"],
        ["abb", "a", "a"], ["abb", "b", "n"], ["done", "a", "done"], ["done", "b", "done"],
      ],
      ["done", "abb"], // wrong: also accepts strings ending in abb
    );
    const report = checkChallenge(aba, almost);
    expect(report.status).toBe("wrong");
    expect(report.exhaustive?.counterexample).not.toBeNull();
  });

  it("an incomplete DFA is not tested; the Lab's problems must be fixed first", () => {
    const lab = build(c, ["x"], [["x", "0", "x"]], []);
    expect(checkChallenge(c, lab)).toMatchObject({ status: "invalid", problems: [expect.stringMatching(/not a valid DFA yet/)] });
  });

  it("the wrong kind, the wrong Σ, or too many states are reported", () => {
    const nfa = labReducer(build(c, ["x"], [["x", "0", "x"], ["x", "1", "x"]], []), { type: "setKind", kind: "NFA" });
    expect(checkChallenge(c, nfa).problems).toEqual([expect.stringMatching(/asks for a DFA/)]);
    const extra = labReducer(build(c, ["x"], [["x", "0", "x"], ["x", "1", "x"]], []), { type: "addSymbol", symbol: "2" });
    expect(checkChallenge(c, extra).problems.join(" ")).toMatch(/Σ must be exactly \{0, 1\}; remove 2/);
    const big = byId("second-last-1");
    const four = build(big, ["a", "b", "c", "d"], [], []);
    expect(checkChallenge(big, four).problems).toContain("Use at most 3 states (yours has 4).");
  });
});
