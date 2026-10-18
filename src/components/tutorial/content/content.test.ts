// Every mathematical claim in the tutorial's examples is checked against the automata engine.
import { describe, expect, it } from "vitest";
import { nfaToDfa, runDFA, runNFA, type DFA, type NFA } from "../../../automata";
import { THIRD_FROM_END_IS_1 } from "../../../automata/examples";
import { allStrings } from "../../../automata/testHelpers";
import { GUARD_NFA } from "../../../game/guard/guardNfa";
import { CHALLENGES } from "../challenges";
import { MACHINES } from "../machines";
import { parseInline } from "../markup";
import { TUTORIAL, TUTORIAL_PAGES } from "./modules";
import type { Widget } from "./types";

const widgets: Widget[] = TUTORIAL_PAGES.flatMap(({ page }) => page.blocks.flatMap((b) => (b.kind === "widget" ? [b.widget] : [])));

describe("tutorial structure", () => {
  it("has the seven required modules, numbered in order", () => {
    expect(TUTORIAL.map((m) => m.id)).toEqual(["intro", "dfa", "nfa", "versus", "conversion", "game-ai", "challenges"]);
    expect(TUTORIAL.map((m) => m.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("gives every page a unique id, a title and content", () => {
    const ids = TUTORIAL_PAGES.map(({ page }) => page.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const { page } of TUTORIAL_PAGES) {
      expect(page.title.length).toBeGreaterThan(0);
      expect(page.blocks.length).toBeGreaterThan(0);
    }
  });

  it("only refers to machines and challenges that exist", () => {
    for (const widget of widgets) {
      if ("machine" in widget) expect(MACHINES[widget.machine], widget.machine).toBeDefined();
      if (widget.type === "challenge") expect(CHALLENGES.some((c) => c.id === widget.challengeId), widget.challengeId).toBe(true);
    }
    // Every challenge appears in the tutorial.
    for (const c of CHALLENGES) expect(widgets.some((w) => w.type === "challenge" && w.challengeId === c.id), c.id).toBe(true);
  });

  it("includes interactive diagrams in every teaching module", () => {
    for (const module of TUTORIAL) {
      expect(module.pages.some((p) => p.blocks.some((b) => b.kind === "widget")), module.id).toBe(true);
    }
  });

  it("has well-formed inline markup (no unbalanced ** or $)", () => {
    const texts = TUTORIAL_PAGES.flatMap(({ page }) =>
      page.blocks.flatMap((b) => (b.kind === "text" || b.kind === "math" || b.kind === "note" ? [b.text] : b.kind === "list" ? [...b.items] : [])),
    );
    for (const text of texts) {
      const plain = parseInline(text).filter((t) => t.kind === "text").map((t) => t.text).join("");
      expect(plain.includes("**"), text).toBe(false);
      expect(plain.includes("$"), text).toBe(false);
      // The renderer shows text literally: no LaTeX-style escapes such as \{ or \_.
      expect(/\\/.test(text), text).toBe(false);
    }
  });

  it("challenge prompts have no LaTeX-style escapes either", () => {
    for (const c of CHALLENGES) expect(/\\/.test(c.prompt + c.hints.join(" ")), c.id).toBe(false);
  });
});

describe("tutorial examples are mathematically correct", () => {
  const steppers = widgets.filter((w): w is Extract<Widget, { type: "stepper" }> => w.type === "stepper");

  it("covers DFA and NFA examples, including the empty string", () => {
    expect(steppers.some((s) => MACHINES[s.machine].automaton.kind === "DFA")).toBe(true);
    expect(steppers.some((s) => MACHINES[s.machine].automaton.kind === "NFA")).toBe(true);
    expect(steppers.some((s) => s.examples.some((e) => e.input.length === 0))).toBe(true);
  });

  for (const stepper of steppers) {
    const automaton = MACHINES[stepper.machine].automaton;
    for (const example of stepper.examples) {
      it(`${stepper.machine}: "${example.label}"`, () => {
        if (automaton.kind === "DFA") {
          const run = runDFA(automaton as DFA, example.input);
          expect([run.finalState]).toEqual(example.expect.final);
          expect(run.accepted).toBe(example.expect.accepted);
        } else {
          const run = runNFA(automaton as NFA, example.input);
          expect(run.finalStates).toEqual(example.expect.final);
          expect(run.accepted).toBe(example.expect.accepted);
        }
      });
    }
  }

  it("states the right sizes: the guard NFA has 7 reachable subsets; 3rd-from-end needs 2³ = 8", () => {
    expect(nfaToDfa(GUARD_NFA).dfa.states).toHaveLength(7);
    expect(nfaToDfa(THIRD_FROM_END_IS_1).dfa.states).toHaveLength(8);
    expect(THIRD_FROM_END_IS_1.states).toHaveLength(4);
  });

  /**
   * Myhill–Nerode: if every state of a DFA is reachable and every pair of its states is told apart
   * by some suffix, no DFA with fewer states accepts the same language. Applied to the subset
   * DFA (all of whose states are reachable by construction), this proves "the smallest DFA needs n".
   */
  function smallestDfaSize(nfa: NFA): number {
    const { dfa } = nfaToDfa(nfa);
    const suffixes = allStrings(dfa.alphabet, dfa.states.length);
    const acceptsFrom = (q: string, w: readonly string[]) => runDFA({ ...dfa, start: q }, w).accepted;
    for (const [i, p] of dfa.states.entries()) {
      for (const q of dfa.states.slice(i + 1)) {
        expect(suffixes.some((w) => acceptsFrom(p, w) !== acceptsFrom(q, w)), `${p} vs ${q}`).toBe(true);
      }
    }
    return dfa.states.length;
  }

  it("“its smallest DFA needs 2³ = 8 states” (3rd from the end is 1) is a proven minimum", () => {
    expect(smallestDfaSize(THIRD_FROM_END_IS_1)).toBe(8);
  });

  it("“a DFA needs 4 states” for Challenge 4 (second-to-last is 1) is a proven minimum", () => {
    const challenge = CHALLENGES.find((c) => c.id === "second-last-1")!;
    expect(challenge.prompt).toMatch(/A DFA needs 4 states/);
    expect(smallestDfaSize(challenge.reference as NFA)).toBe(4);
    expect(challenge.maxStates).toBe(3);
  });
});
