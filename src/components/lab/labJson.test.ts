import { describe, expect, it } from "vitest";
import { acceptsDFA, acceptsNFA, EPSILON, runNFA, type DFA, type NFA } from "../../automata";
import { allStrings } from "../../automata/testHelpers";
import { GUARD_DFA } from "../../game/guard/guardDfa";
import { GUARD_NFA } from "../../game/guard/guardNfa";
import { labFileName, LAB_FILE_FORMAT, parseLab, serializeLab } from "./labJson";
import { exampleLab, labReducer, type LabAutomaton } from "./labModel";
import { LAB_PRESETS } from "./labPresets";
import { labToAutomaton, validateLab } from "./labValidation";

function load(text: string): LabAutomaton {
  const result = parseLab(text);
  if (!result.ok) throw new Error(result.error);
  return result.lab;
}
const preset = (id: string) => LAB_PRESETS.find((p) => p.id === id)!.build();

describe("serializeLab / parseLab round trip", () => {
  it.each(LAB_PRESETS.map((p) => [p.label, p] as const))("'%s' survives save → load unchanged (incl. positions)", (_label, p) => {
    const lab = p.build();
    expect(load(serializeLab(lab))).toEqual(lab);
  });

  it("keeps ε-transitions, kind, start and accepting states", () => {
    const lab = load(serializeLab(preset("guard-nfa")));
    expect(lab.kind).toBe("NFA");
    expect(lab.transitions.filter((t) => t.symbol === EPSILON)).toHaveLength(2);
    expect(labToAutomaton(lab).start).toBe("PATROL");
    expect(labToAutomaton(lab).accepting).toEqual(["CAPTURE"]);
  });

  it("keeps an edited document exactly, including dragged positions and renamed states", () => {
    let lab = exampleLab();
    lab = labReducer(lab, { type: "moveState", id: lab.states[0].id, x: 123, y: 456 });
    lab = labReducer(lab, { type: "renameState", id: lab.states[1].id, name: "ODD" });
    expect(load(serializeLab(lab))).toEqual(lab);
  });

  it("writes a tagged, versioned, readable file", () => {
    const file = JSON.parse(serializeLab(exampleLab()));
    expect(file).toMatchObject({ format: LAB_FILE_FORMAT, version: 1, kind: "DFA", name: "Even number of a's" });
    expect(file.states[0]).toEqual({ id: expect.any(String), name: "even", x: expect.any(Number), y: expect.any(Number) });
    expect(serializeLab(exampleLab())).toContain("\n  "); // pretty-printed
  });

  it("suggests a safe file name", () => {
    expect(labFileName(preset("guard-dfa"))).toBe("guard-behaviour-dfa.json");
    expect(labFileName({ ...exampleLab(), name: "∅ ε ?" })).toBe("automaton.json");
  });
});

describe("DFA / NFA behaviour after loading", () => {
  it("a saved guard DFA behaves exactly like GUARD_DFA (all strings up to length 4)", () => {
    const dfa = labToAutomaton(load(serializeLab(preset("guard-dfa")))) as DFA;
    for (const input of allStrings(GUARD_DFA.alphabet, 4)) expect(acceptsDFA(dfa, input)).toBe(acceptsDFA(GUARD_DFA, input));
  });

  it("a saved guard NFA has the same active-state sets as GUARD_NFA (all strings up to length 4)", () => {
    const nfa = labToAutomaton(load(serializeLab(preset("guard-nfa")))) as NFA;
    for (const input of allStrings(GUARD_NFA.alphabet, 4)) {
      expect(runNFA(nfa, input).finalStates).toEqual(runNFA(GUARD_NFA, input).finalStates);
    }
  });

  it("a saved textbook NFA accepts the same language", () => {
    const original = labToAutomaton(preset("third-from-end")) as NFA;
    const loaded = labToAutomaton(load(serializeLab(preset("third-from-end")))) as NFA;
    for (const input of allStrings(["0", "1"], 7)) expect(acceptsNFA(loaded, input)).toBe(acceptsNFA(original, input));
  });
});

describe("parseLab: malformed files are refused with a reason", () => {
  const good = () => JSON.parse(serializeLab(exampleLab()));
  const withChange = (change: (f: Record<string, unknown>) => void) => {
    const f = good();
    change(f);
    return JSON.stringify(f);
  };

  it.each([
    ["not JSON", "{ nope", /not valid JSON/],
    ["not an object", "[1, 2]", /JSON object/],
    ["wrong format tag", withChange((f) => (f.format = "something-else")), /Not a Shadow Protocol/],
    ["future version", withChange((f) => (f.version = 99)), /Unsupported file version 99/],
    ["bad kind", withChange((f) => (f.kind = "PDA")), /"kind"/],
    ["alphabet not strings", withChange((f) => (f.alphabet = ["a", 2])), /"alphabet"/],
    ["states missing", withChange((f) => delete f.states), /"states"/],
    ["state without a name", withChange((f) => ((f.states as object[])[0] = { id: "s1" })), /State #1/],
    ["non-numeric position", withChange((f) => ((f.states as { x: unknown }[])[0].x = "left")), /non-numeric position/],
    ["duplicate state id", withChange((f) => ((f.states as { id: string }[])[1].id = (f.states as { id: string }[])[0].id)), /used twice/],
    ["transition missing a field", withChange((f) => ((f.transitions as object[])[0] = { from: "s1", to: "s2" })), /Transition #1/],
    ["start of the wrong type", withChange((f) => (f.start = 3)), /"start"/],
  ])("%s", (_name, text, error) => {
    const result = parseLab(text as string);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(error as RegExp);
  });
});

describe("parseLab: well-formed files with automaton problems load, and validation explains them", () => {
  const base = () => JSON.parse(serializeLab(exampleLab()));

  it("invalid symbols", () => {
    const f = base();
    f.transitions[0].symbol = "z";
    expect(validateLab(load(JSON.stringify(f))).map((i) => i.code)).toContain("UNKNOWN_SYMBOL");
  });

  it("references to states that do not exist (transition ends, start, accepting)", () => {
    const f = base();
    f.transitions[0].to = "ghost";
    f.start = "nobody";
    f.accepting = ["phantom"];
    const codes = validateLab(load(JSON.stringify(f))).map((i) => i.code);
    expect(codes).toEqual(expect.arrayContaining(["UNKNOWN_STATE", "START_NOT_IN_STATES", "ACCEPTING_NOT_IN_STATES"]));
  });

  it("duplicate state names", () => {
    const f = base();
    f.states[1].name = f.states[0].name;
    expect(validateLab(load(JSON.stringify(f))).map((i) => i.code)).toContain("DUPLICATE_STATE");
  });

  it("an incomplete DFA", () => {
    const f = base();
    f.transitions.pop();
    expect(validateLab(load(JSON.stringify(f))).map((i) => i.code)).toEqual(["MISSING_TRANSITION"]);
  });
});

describe("parseLab: hand-written files", () => {
  it("lays out states without positions, invents missing transition ids, and keeps new ids unique", () => {
    const text = JSON.stringify({
      format: LAB_FILE_FORMAT,
      version: 1,
      kind: "NFA",
      name: "hand-made",
      alphabet: ["a"],
      states: [{ id: "s7", name: "p" }, { id: "s9", name: "q" }],
      transitions: [{ from: "s7", symbol: "a", to: "s9" }, { from: "s9", symbol: EPSILON, to: "s7" }],
      start: "s7",
      accepting: ["s9"],
    });
    let lab = load(text);
    expect(validateLab(lab)).toEqual([]);
    expect(new Set(lab.states.map((s) => `${s.x},${s.y}`)).size).toBe(2);
    expect(lab.transitions.map((t) => t.id)).toEqual(["t10", "t11"]);
    lab = labReducer(lab, { type: "addState", x: 100, y: 100 });
    const ids = [...lab.states.map((s) => s.id), ...lab.transitions.map((t) => t.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("parseLab: hand-edited files that break the editor's rules (7C.1 regressions)", () => {
  const base = () => JSON.parse(serializeLab(exampleLab()));
  const load = (change: (f: Record<string, any>) => void) => {
    const f = base();
    change(f);
    const result = parseLab(JSON.stringify(f));
    if (!result.ok) throw new Error(result.error);
    return result.lab;
  };
  const codes = (lab: LabAutomaton) => validateLab(lab).map((i) => i.code);

  it("an accepting state listed twice is one element of F", () => {
    const lab = load((f) => (f.accepting = [f.accepting[0], f.accepting[0]]));
    expect(lab.acceptingIds).toHaveLength(1);
    expect(labToAutomaton(lab).accepting).toEqual(["even"]);
  });

  it.each([
    ["an empty name", ""],
    ["a blank name", "   "],
    ["the name ε", EPSILON],
  ])("a state with %s is reported (and so cannot be simulated)", (_label, name) => {
    const lab = load((f) => (f.states[0].name = name));
    const issue = validateLab(lab).find((i) => i.code === "BAD_STATE_NAME");
    expect(issue?.stateIds).toEqual([lab.states[0].id]);
  });

  it.each([[""], ["a b"], ["a,b"]])("the symbol %j cannot be typed as input, so it is reported", (symbol) => {
    expect(codes(load((f) => f.alphabet.push(symbol)))).toContain("BAD_SYMBOL");
  });

  it("ε in Σ is reported once, by the engine, not again as a bad symbol", () => {
    const issues = codes(load((f) => f.alphabet.push(EPSILON)));
    expect(issues).toContain("EPSILON_IN_ALPHABET");
    expect(issues).not.toContain("BAD_SYMBOL");
  });

  it("every preset passes the new rules", () => {
    for (const preset of LAB_PRESETS) expect(codes(preset.build()), preset.id).toEqual([]);
  });
});
