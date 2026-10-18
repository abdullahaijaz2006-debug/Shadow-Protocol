import { describe, expect, it } from "vitest";
import { A_STAR_OR_B_STAR, ENDS_WITH_01, THIRD_FROM_END_IS_1 } from "../../automata/examples";
import { GUARD_NFA } from "../../game/guard/guardNfa";
import { subsetConstructionSteps } from "./subsetSteps";

describe.each([
  ["ENDS_WITH_01", ENDS_WITH_01],
  ["A_STAR_OR_B_STAR (ε)", A_STAR_OR_B_STAR],
  ["THIRD_FROM_END_IS_1", THIRD_FROM_END_IS_1],
  ["GUARD_NFA", GUARD_NFA],
] as const)("subsetConstructionSteps(%s)", (_name, nfa) => {
  const { start, steps, result } = subsetConstructionSteps(nfa);
  const { dfa } = result;

  it("starts at the DFA's start state, ECLOSE({q₀})", () => {
    expect(start.name).toBe(dfa.start);
    expect(start.closure).toEqual(result.subsets[dfa.start]);
  });

  it("has one row per DFA transition (|Q_D| × |Σ|), each matching the engine's δ_D", () => {
    expect(steps).toHaveLength(dfa.states.length * dfa.alphabet.length);
    for (const step of steps) {
      const edge = dfa.transitions.find((t) => t.from === step.fromName && t.symbol === step.symbol)!;
      expect(step.toName, `${step.fromName} ${step.symbol}`).toBe(edge.to);
      expect(step.to).toEqual(result.subsets[edge.to]);
    }
  });

  it("discovers subsets in exactly the engine's order, each marked new once", () => {
    expect(steps[steps.length - 1].discovered).toEqual(dfa.states);
    expect(steps.filter((s) => s.isNew)).toHaveLength(dfa.states.length - 1); // all but the start
  });
});

describe("a worked example: ENDS_WITH_01", () => {
  it("first row: from {q0} on 0, move to {q0, q1} (new)", () => {
    const [first] = subsetConstructionSteps(ENDS_WITH_01).steps;
    expect(first).toMatchObject({ fromName: "{q0}", symbol: "0", moved: ["q0", "q1"], toName: "{q0,q1}", isNew: true });
  });
});
