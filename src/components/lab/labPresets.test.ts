import { describe, expect, it } from "vitest";
import { acceptsDFA, acceptsNFA, type Automaton, type DFA, type NFA } from "../../automata";
import { allStrings } from "../../automata/testHelpers";
import { GUARD_DFA } from "../../game/guard/guardDfa";
import { GUARD_NFA } from "../../game/guard/guardNfa";
import { LAB_CANVAS, labReducer } from "./labModel";
import { automatonToLab, LAB_PRESETS } from "./labPresets";
import { labToAutomaton, validateLab } from "./labValidation";

const key = (a: Automaton) => a.transitions.map((t) => `${t.from} ${t.symbol} ${t.to}`).sort();
const accepts = (a: Automaton, input: string[]) => (a.kind === "DFA" ? acceptsDFA(a as DFA, input) : acceptsNFA(a as NFA, input));

describe("LAB_PRESETS", () => {
  it.each(LAB_PRESETS.map((p) => [p.label, p] as const))("'%s' is a valid automaton of its declared kind", (_label, preset) => {
    const lab = preset.build();
    expect(lab.kind).toBe(preset.kind);
    expect(validateLab(lab)).toEqual([]);
    for (const s of lab.states) {
      expect(s.x).toBeGreaterThan(0);
      expect(s.x).toBeLessThan(LAB_CANVAS.width);
      expect(s.y).toBeGreaterThan(0);
      expect(s.y).toBeLessThan(LAB_CANVAS.height);
    }
  });

  it("includes the guard behaviour DFA, identical to the one the guards run", () => {
    const lab = LAB_PRESETS.find((p) => p.id === "guard-dfa")!.build();
    const formal = labToAutomaton(lab);
    expect(formal.states).toEqual(GUARD_DFA.states);
    expect(formal.alphabet).toEqual(GUARD_DFA.alphabet);
    expect(key(formal)).toEqual(key(GUARD_DFA));
    expect(formal.start).toBe(GUARD_DFA.start);
    expect(formal.accepting).toEqual(GUARD_DFA.accepting);
  });

  it("includes the guard NFA with its ε-transitions", () => {
    const formal = labToAutomaton(LAB_PRESETS.find((p) => p.id === "guard-nfa")!.build());
    expect(key(formal)).toEqual(key(GUARD_NFA));
  });

  it("gives an independent copy: editing it never touches GUARD_DFA", () => {
    const before = JSON.stringify(GUARD_DFA);
    let lab = LAB_PRESETS.find((p) => p.id === "guard-dfa")!.build();
    lab = labReducer(lab, { type: "deleteState", id: lab.states[0].id });
    lab = labReducer(lab, { type: "renameState", id: lab.states[0].id, name: "HACKED" });
    lab = labReducer(lab, { type: "removeSymbol", symbol: "PLAYER_SPOTTED" });
    expect(JSON.stringify(GUARD_DFA)).toBe(before);
    // A second copy is unaffected by edits to the first.
    expect(labToAutomaton(LAB_PRESETS.find((p) => p.id === "guard-dfa")!.build()).states).toEqual(GUARD_DFA.states);
  });
});

describe("automatonToLab", () => {
  it("round-trips any engine automaton (same 5-tuple, same language)", () => {
    for (const preset of LAB_PRESETS) {
      const original = labToAutomaton(preset.build());
      const again = labToAutomaton(automatonToLab(original, "copy"));
      expect(key(again)).toEqual(key(original));
      expect(again.start).toBe(original.start);
      for (const input of allStrings(original.alphabet, original.alphabet.length > 2 ? 2 : 5)) {
        expect(accepts(again, input)).toBe(accepts(original, input));
      }
    }
  });

  it("gives new stable ids and a nextId past all of them", () => {
    const lab = automatonToLab(GUARD_DFA, "g");
    const numbers = [...lab.states.map((s) => s.id), ...lab.transitions.map((t) => t.id)].map((id) => Number(id.slice(1)));
    expect(new Set(numbers).size).toBe(numbers.length);
    expect(lab.nextId).toBeGreaterThan(Math.max(...numbers));
  });
});
