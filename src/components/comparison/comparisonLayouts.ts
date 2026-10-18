import { ellipseLayout, type GraphLayout } from "../visualizer/graphLayout";
import { GUARD_GRAPH_LAYOUT, GUARD_GRAPH_VIEWBOX } from "../visualizer/guardLayout";
import { COMPARISON_CONVERSION, dfaStateAlias } from "./comparisonModel";

/** The NFA uses the same five state names as the guard DFA, so it reuses that hand-made layout. */
export const NFA_GRAPH_LAYOUT: GraphLayout = GUARD_GRAPH_LAYOUT;
export const NFA_GRAPH_VIEWBOX = GUARD_GRAPH_VIEWBOX;

export const SUBSET_GRAPH_VIEWBOX = { width: 580, height: 400 } as const;

/**
 * The subset DFA's states on an ellipse, starting with D0 on the left (next to the start arrow).
 * The order puts the most strongly connected states side by side, which keeps most arrows short.
 */
const ORDER = ["D0", "D2", "D6", "D4", "D3", "D1", "D5"];

const ellipse = ellipseLayout(
  [...COMPARISON_CONVERSION.dfa.states].sort(
    (a, b) => ORDER.indexOf(dfaStateAlias(a)) - ORDER.indexOf(dfaStateAlias(b)),
  ),
  { x: 300, y: 200 },
  200,
  125,
  Math.PI,
);

// The start state's self-loop goes on top, leaving its left side for the start arrow.
export const SUBSET_GRAPH_LAYOUT: GraphLayout = {
  ...ellipse,
  [COMPARISON_CONVERSION.dfa.start]: { ...ellipse[COMPARISON_CONVERSION.dfa.start], loop: "up" },
};

/** The subset construction's trap state: the empty set (every NFA path has died). */
export const TRAP_STATE = "∅";
