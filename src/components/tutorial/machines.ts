// The automata the tutorial shows, with a drawing layout for each. Display data only: the
// automata themselves are the engine's examples and the game's own definitions.
import type { Automaton } from "../../automata";
import { A_STAR_OR_B_STAR, ENDS_WITH_01, ENDS_WITH_AB } from "../../automata/examples";
import { GUARD_DFA, type GuardSymbol } from "../../game/guard/guardDfa";
import { GUARD_NFA } from "../../game/guard/guardNfa";
import type { GraphLayout } from "../visualizer/graphLayout";
import { GUARD_GRAPH_LAYOUT, GUARD_GRAPH_VIEWBOX, GUARD_SYMBOL_LABELS } from "../visualizer/guardLayout";

export type MachineId = "guardDfa" | "guardNfa" | "endsWithAb" | "endsWith01" | "aStarOrBStar";

export interface TutorialMachine {
  readonly name: string;
  readonly automaton: Automaton;
  readonly layout: GraphLayout;
  readonly viewBox: { readonly width: number; readonly height: number };
  readonly symbolLabel?: (symbol: string) => string;
}

const guardLabel = (symbol: string) => GUARD_SYMBOL_LABELS[symbol as GuardSymbol] ?? symbol;

export const MACHINES: Readonly<Record<MachineId, TutorialMachine>> = {
  guardDfa: { name: "Guard behaviour DFA", automaton: GUARD_DFA, layout: GUARD_GRAPH_LAYOUT, viewBox: GUARD_GRAPH_VIEWBOX, symbolLabel: guardLabel },
  guardNfa: { name: "Suspicious guard NFA", automaton: GUARD_NFA, layout: GUARD_GRAPH_LAYOUT, viewBox: GUARD_GRAPH_VIEWBOX, symbolLabel: guardLabel },
  endsWithAb: {
    name: "DFA: strings ending in ab",
    automaton: ENDS_WITH_AB,
    layout: { q0: { x: 90, y: 190, loop: "down" }, q1: { x: 230, y: 80, loop: "up" }, q2: { x: 370, y: 190, loop: "right" } },
    viewBox: { width: 460, height: 280 },
  },
  endsWith01: {
    name: "NFA: strings ending in 01",
    automaton: ENDS_WITH_01,
    layout: { q0: { x: 90, y: 130, loop: "up" }, q1: { x: 230, y: 130, loop: "up" }, q2: { x: 370, y: 130, loop: "up" } },
    viewBox: { width: 460, height: 210 },
  },
  aStarOrBStar: {
    name: "ε-NFA: a* ∪ b*",
    automaton: A_STAR_OR_B_STAR,
    layout: { s: { x: 100, y: 150, loop: "down" }, pa: { x: 280, y: 75, loop: "right" }, pb: { x: 280, y: 225, loop: "right" } },
    viewBox: { width: 400, height: 300 },
  },
};
