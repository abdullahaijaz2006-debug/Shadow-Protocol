import { describe, expect, it } from "vitest";
import { nfaToDfa, validateDFA, type DFA, type NFA } from "../../automata";
import { GUARD_NFA } from "../../game/guard/guardNfa";
import { checkEquivalence, convertLabToDfa } from "./labConversion";
import { exampleLab, LAB_CANVAS, labReducer } from "./labModel";
import { LAB_PRESETS } from "./labPresets";
import { labToAutomaton } from "./labValidation";

const preset = (id: string) => LAB_PRESETS.find((p) => p.id === id)!.build();

describe("convertLabToDfa", () => {
  it.each(LAB_PRESETS.filter((p) => p.kind === "NFA").map((p) => [p.label, p.id] as const))(
    "'%s' → a valid DFA with the same language",
    (_label, id) => {
      const nfaLab = preset(id);
      const result = convertLabToDfa(nfaLab);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const dfa = labToAutomaton(result.lab) as DFA;
      expect(result.lab.kind).toBe("DFA");
      expect(validateDFA(dfa)).toEqual([]);
      expect(checkEquivalence(labToAutomaton(nfaLab), dfa).equivalent).toBe(true);
      for (const s of result.lab.states) expect(s.x).toBeLessThan(LAB_CANVAS.width);
    },
  );

  it("is exactly the engine's subset construction (guard NFA → 7 states named by their subsets)", () => {
    const result = convertLabToDfa(preset("guard-nfa"));
    if (!result.ok) throw new Error(result.reason);
    const engine = nfaToDfa(GUARD_NFA).dfa;
    expect(labToAutomaton(result.lab).states).toEqual(engine.states);
    expect(result.lab.states.map((s) => s.name)).toContain("{PATROL,ALERT,SEARCH,CHASE}");
    expect(result.subsets["{PATROL,SEARCH}"]).toEqual(["PATROL", "SEARCH"]);
    expect(result.lab.name).toBe("Suspicious guard NFA → DFA");
  });

  it("shows the 2³ blow-up for '3rd from end is 1'", () => {
    const result = convertLabToDfa(preset("third-from-end"));
    expect(result.ok && result.lab.states.length).toBe(8);
  });

  it("refuses DFAs and invalid NFAs, with a reason", () => {
    expect(convertLabToDfa(exampleLab())).toEqual({ ok: false, reason: expect.stringMatching(/Only an NFA/) });
    const broken = labReducer(preset("ends-01"), { type: "setStart", id: null });
    expect(convertLabToDfa(broken)).toEqual({ ok: false, reason: expect.stringMatching(/Fix the 1 problem/) });
  });
});

describe("checkEquivalence", () => {
  it("tests every string up to the longest length that fits the budget", () => {
    const nfa = labToAutomaton(preset("ends-01")) as NFA;
    const report = checkEquivalence(nfa, nfaToDfa(nfa).dfa, 100);
    // 1 + 2 + 4 + 8 + 16 + 32 = 63 strings (length ≤ 5); length 6 would exceed 100.
    expect(report).toEqual({ equivalent: true, tested: 63, maxLength: 5, counterexample: null });
  });

  it("finds a shortest counterexample when the languages differ", () => {
    const evenA = labToAutomaton(exampleLab());
    const flipped = { ...evenA, accepting: evenA.states.filter((s) => !evenA.accepting.includes(s)) };
    expect(checkEquivalence(evenA, flipped)).toMatchObject({ equivalent: false, counterexample: [] });
  });
});
