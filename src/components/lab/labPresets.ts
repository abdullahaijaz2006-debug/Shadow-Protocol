// Ready-made automata for the Lab, built from the engine's own definitions. Pure TypeScript.
import type { Automaton, State } from "../../automata";
import {
  A_STAR_OR_B_STAR,
  DIVISIBLE_BY_3,
  ENDS_WITH_01,
  ENDS_WITH_AB,
  EVEN_ZEROS,
  THIRD_FROM_END_IS_1,
} from "../../automata/examples";
import { GUARD_DFA } from "../../game/guard/guardDfa";
import { GUARD_NFA } from "../../game/guard/guardNfa";
import { ellipseLayout } from "../visualizer/graphLayout";
import { GUARD_GRAPH_LAYOUT, GUARD_GRAPH_VIEWBOX } from "../visualizer/guardLayout";
import { clampToCanvas, exampleLab, LAB_CANVAS, type LabAutomaton, type LabState, type LabTransition } from "./labModel";

export type Positions = Readonly<Record<State, { readonly x: number; readonly y: number }>>;

/** States evenly spaced on an ellipse across the Lab canvas, the start state on the left. */
export function autoPositions(states: readonly State[], start?: State): Positions {
  const ordered = start && states.includes(start) ? [start, ...states.filter((s) => s !== start)] : [...states];
  const layout = ellipseLayout(
    ordered,
    { x: LAB_CANVAS.width / 2, y: LAB_CANVAS.height / 2 },
    LAB_CANVAS.width / 2 - 130,
    LAB_CANVAS.height / 2 - 110,
    Math.PI,
  );
  return Object.fromEntries(ordered.map((s) => [s, { x: layout[s].x, y: layout[s].y }]));
}

/**
 * A fresh, editable Lab document for an engine automaton (a deep copy: editing it can never change
 * the original, e.g. the guards' GUARD_DFA). States get new stable ids; names are kept.
 */
export function automatonToLab(automaton: Automaton, name: string, positions?: Positions): LabAutomaton {
  const where = positions ?? autoPositions(automaton.states, automaton.start);
  const ids = new Map(automaton.states.map((state, index) => [state, `s${index + 1}`]));
  const states: LabState[] = automaton.states.map((state) => ({
    id: ids.get(state)!,
    name: state,
    ...clampToCanvas(where[state]?.x ?? LAB_CANVAS.width / 2, where[state]?.y ?? LAB_CANVAS.height / 2),
  }));
  const firstTransitionId = automaton.states.length + 1;
  const transitions: LabTransition[] = automaton.transitions.map((t, index) => ({
    id: `t${firstTransitionId + index}`,
    from: ids.get(t.from) ?? t.from,
    to: ids.get(t.to) ?? t.to,
    symbol: t.symbol,
  }));
  return {
    kind: automaton.kind,
    name,
    states,
    alphabet: [...automaton.alphabet],
    transitions,
    startId: ids.get(automaton.start) ?? null,
    acceptingIds: automaton.accepting.map((s) => ids.get(s)).filter((id): id is string => id !== undefined),
    nextId: firstTransitionId + transitions.length,
  };
}

/** The guard visualizer's hand-made layout, scaled up to the Lab canvas. */
function guardPositions(): Positions {
  const scale = Math.min(LAB_CANVAS.width / GUARD_GRAPH_VIEWBOX.width, LAB_CANVAS.height / GUARD_GRAPH_VIEWBOX.height);
  const dx = (LAB_CANVAS.width - GUARD_GRAPH_VIEWBOX.width * scale) / 2;
  const dy = (LAB_CANVAS.height - GUARD_GRAPH_VIEWBOX.height * scale) / 2;
  return Object.fromEntries(
    Object.entries(GUARD_GRAPH_LAYOUT).map(([state, p]) => [state, { x: dx + p.x * scale, y: dy + p.y * scale }]),
  );
}

export interface LabPreset {
  readonly id: string;
  readonly label: string;
  readonly kind: "DFA" | "NFA";
  readonly description: string;
  readonly build: () => LabAutomaton;
}

export const LAB_PRESETS: readonly LabPreset[] = [
  {
    id: "guard-dfa",
    label: "Guard behaviour DFA",
    kind: "DFA",
    description: "The DFA that drives every guard in the level (an independent copy: editing it never affects the game).",
    build: () => automatonToLab(GUARD_DFA, "Guard behaviour DFA", guardPositions()),
  },
  {
    id: "guard-nfa",
    label: "Suspicious guard NFA",
    kind: "NFA",
    description: "The NFA from the NFA ⇄ DFA mode, with ε-transitions and two paths on a sound.",
    build: () => automatonToLab(GUARD_NFA, "Suspicious guard NFA", guardPositions()),
  },
  { id: "even-a", label: "Even number of a's", kind: "DFA", description: "The Lab's starting example.", build: exampleLab },
  { id: "even-zeros", label: "Even number of 0s", kind: "DFA", description: "Strings over {0, 1} with an even number of 0s.", build: () => automatonToLab(EVEN_ZEROS, "Even number of 0s") },
  { id: "ends-ab", label: "Ends with ab", kind: "DFA", description: "Strings over {a, b} ending in ab.", build: () => automatonToLab(ENDS_WITH_AB, "Ends with ab") },
  { id: "div-3", label: "Binary divisible by 3", kind: "DFA", description: "Binary numbers whose value is a multiple of 3.", build: () => automatonToLab(DIVISIBLE_BY_3, "Binary divisible by 3") },
  { id: "ends-01", label: "Ends with 01 (NFA)", kind: "NFA", description: "Guesses where the final 01 starts.", build: () => automatonToLab(ENDS_WITH_01, "Ends with 01") },
  {
    id: "third-from-end",
    label: "3rd from end is 1 (NFA)",
    kind: "NFA",
    description: "4 states as an NFA, but its DFA needs 2³ = 8: try converting it.",
    build: () => automatonToLab(THIRD_FROM_END_IS_1, "3rd symbol from the end is 1"),
  },
  { id: "a-or-b", label: "a* ∪ b* (ε-NFA)", kind: "NFA", description: "ε-transitions choose a branch before reading.", build: () => automatonToLab(A_STAR_OR_B_STAR, "a* ∪ b*") },
];
