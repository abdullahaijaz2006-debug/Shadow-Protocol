// Pure geometry for drawing a DFA or NFA as a state graph. No React imports, so it can be unit-tested.
import { EPSILON, type Automaton, type InputSymbol, type State } from "../../automata";

export type LoopSide = "up" | "down" | "left" | "right";

export interface NodePosition {
  readonly x: number;
  readonly y: number;
  /** Which side of the node its self-loop is drawn on. */
  readonly loop: LoopSide;
}

export type GraphLayout = Readonly<Record<State, NodePosition>>;

/** One arrow in the drawing: every δ edge with the same (from, to), merged under one label. */
export interface GraphEdge {
  readonly from: State;
  readonly to: State;
  /** Symbols in Σ order (just [ε] for an ε-edge). */
  readonly symbols: readonly InputSymbol[];
  readonly selfLoop: boolean;
  /** An NFA ε-transition: drawn as its own (dashed) arrow, never merged with symbol edges. */
  readonly epsilon: boolean;
}

export const NODE_RADIUS = 28;

/** Stable key of a drawn arrow: "from->to", with ":ε" for an ε-arrow. */
export function edgeKey(edge: { readonly from: State; readonly to: State; readonly epsilon: boolean }): string {
  return `${edge.from}->${edge.to}${edge.epsilon ? ":ε" : ""}`;
}

/**
 * Groups δ's edges by (from, to), so each pair of states gets one arrow listing all its symbols.
 * ε-edges are kept separate from symbol edges so they can be drawn differently.
 */
export function buildGraphEdges(automaton: Automaton): GraphEdge[] {
  const order = new Map(automaton.alphabet.map((symbol, index) => [symbol, index]));
  const edges = new Map<string, { from: State; to: State; symbols: InputSymbol[]; epsilon: boolean }>();
  for (const { from, symbol, to } of automaton.transitions) {
    const epsilon = symbol === EPSILON;
    const key = JSON.stringify([from, to, epsilon]);
    let edge = edges.get(key);
    if (!edge) edges.set(key, (edge = { from, to, symbols: [], epsilon }));
    edge.symbols.push(symbol);
  }
  return [...edges.values()].map((edge) => ({
    ...edge,
    symbols: [...edge.symbols].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0)),
    selfLoop: edge.from === edge.to,
  }));
}

/** Evenly spaced positions on a circle, for automata without a hand-made layout. */
export function circularLayout(states: readonly State[], width: number, height: number): GraphLayout {
  const radius = Math.min(width, height) / 2 - NODE_RADIUS * 3;
  return ellipseLayout(states, { x: width / 2, y: height / 2 }, radius, radius, -Math.PI / 2);
}

/**
 * States evenly spaced (in the given order) around an ellipse, starting at `startAngle` and going
 * clockwise on screen, with every self-loop drawn on the outside. Because all nodes lie on the
 * ellipse, no straight arrow can pass through a third node.
 */
export function ellipseLayout(
  states: readonly State[],
  center: { x: number; y: number },
  rx: number,
  ry: number,
  startAngle: number,
): GraphLayout {
  return Object.fromEntries(
    states.map((state, index) => {
      const angle = startAngle + (2 * Math.PI * index) / states.length;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const loop: LoopSide = Math.abs(cos) > Math.abs(sin) ? (cos > 0 ? "right" : "left") : sin > 0 ? "down" : "up";
      return [state, { x: center.x + rx * cos, y: center.y + ry * sin, loop }];
    }),
  );
}

export interface EdgeGeometry {
  /** SVG path data, from the edge of the source circle to the edge of the target circle. */
  readonly path: string;
  /** Where to put the label, and how to anchor its text. */
  readonly label: { readonly x: number; readonly y: number; readonly anchor: "start" | "middle" | "end" };
}

const LOOP_DIRECTION: Record<LoopSide, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/**
 * Path and label position for one edge. Edges whose reverse also exists are bent to one side so
 * the two arrows don't overlap; self-loops are drawn as a teardrop on the node's `loop` side.
 */
export function edgeGeometry(edge: GraphEdge, layout: GraphLayout, hasReverse: boolean): EdgeGeometry {
  const a = layout[edge.from];
  const b = layout[edge.to];

  if (edge.selfLoop) {
    const d = LOOP_DIRECTION[a.loop];
    const side = { x: -d.y, y: d.x }; // perpendicular to the loop direction
    const spread = 0.5;
    const start = { x: a.x + NODE_RADIUS * (d.x + side.x * spread), y: a.y + NODE_RADIUS * (d.y + side.y * spread) };
    const end = { x: a.x + NODE_RADIUS * (d.x - side.x * spread), y: a.y + NODE_RADIUS * (d.y - side.y * spread) };
    const reach = NODE_RADIUS * 2.2;
    const c1 = { x: a.x + d.x * reach + side.x * NODE_RADIUS, y: a.y + d.y * reach + side.y * NODE_RADIUS };
    const c2 = { x: a.x + d.x * reach - side.x * NODE_RADIUS, y: a.y + d.y * reach - side.y * NODE_RADIUS };
    const labelAt = { x: a.x + d.x * (reach + 6), y: a.y + d.y * (reach + 6) };
    return {
      path: `M ${f(start.x)} ${f(start.y)} C ${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(end.x)} ${f(end.y)}`,
      label: { ...labelAt, anchor: a.loop === "left" ? "end" : a.loop === "right" ? "start" : "middle" },
    };
  }

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  const ux = dx / length;
  const uy = dy / length;
  // Left-hand normal of the direction of travel; bent edges curve toward it.
  const nx = uy;
  const ny = -ux;
  const bend = hasReverse ? 22 : 0;
  const mid = { x: (a.x + b.x) / 2 + nx * bend, y: (a.y + b.y) / 2 + ny * bend };
  // Leave the circles along the direction of the control point so arrows touch the rim.
  const start = towards(a, mid, NODE_RADIUS);
  const end = towards(b, mid, NODE_RADIUS + 2);
  const labelOffset = bend > 0 ? 14 : 10;
  const label = { x: (a.x + b.x) / 2 + nx * (bend / 2 + labelOffset), y: (a.y + b.y) / 2 + ny * (bend / 2 + labelOffset) };
  return {
    path: `M ${f(start.x)} ${f(start.y)} Q ${f(mid.x)} ${f(mid.y)} ${f(end.x)} ${f(end.y)}`,
    label: { ...label, anchor: Math.abs(nx) < 0.3 ? "middle" : nx > 0 ? "start" : "end" },
  };
}

function towards(from: { x: number; y: number }, to: { x: number; y: number }, distance: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: from.x + (dx / length) * distance, y: from.y + (dy / length) * distance };
}

function f(n: number): string {
  return n.toFixed(1);
}
