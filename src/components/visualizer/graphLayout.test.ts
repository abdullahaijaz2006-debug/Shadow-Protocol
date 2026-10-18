import { describe, expect, it } from "vitest";
import { EVEN_ZEROS } from "../../automata/examples";
import { GUARD_DFA, GUARD_STATES } from "../../game/guard/guardDfa";
import { buildGraphEdges, circularLayout, edgeGeometry, NODE_RADIUS } from "./graphLayout";
import { GUARD_GRAPH_LAYOUT, GUARD_GRAPH_VIEWBOX } from "./guardLayout";

describe("buildGraphEdges(GUARD_DFA): the drawing shows exactly δ", () => {
  const edges = buildGraphEdges(GUARD_DFA);

  it("draws every one of the 25 transitions exactly once", () => {
    const drawn = edges.flatMap((edge) => edge.symbols.map((symbol) => `${edge.from} ${symbol} ${edge.to}`));
    const actual = GUARD_DFA.transitions.map((t) => `${t.from} ${t.symbol} ${t.to}`);
    expect(drawn.sort()).toEqual(actual.sort());
    expect(drawn).toHaveLength(25);
  });

  it("merges symbols that share a (from, to) pair into one arrow", () => {
    const loops = edges.filter((edge) => edge.selfLoop);
    expect(loops.map((edge) => edge.from).sort()).toEqual([...GUARD_STATES].sort());
    expect(loops.find((edge) => edge.from === "CAPTURE")!.symbols).toEqual(GUARD_DFA.alphabet);
    expect(edges.filter((edge) => !edge.selfLoop)).toHaveLength(8);
  });

  it("lists symbols in Σ order", () => {
    const patrolLoop = edges.find((edge) => edge.from === "PATROL" && edge.to === "PATROL")!;
    expect(patrolLoop.symbols).toEqual(["PLAYER_LOST", "PLAYER_CAUGHT", "TIMER_EXPIRED"]);
  });

  it("works for any DFA, not just the guard", () => {
    expect(buildGraphEdges(EVEN_ZEROS)).toHaveLength(4);
  });
});

describe("guard graph layout", () => {
  it("places every state inside the view box, with room for its circle", () => {
    for (const state of GUARD_STATES) {
      const p = GUARD_GRAPH_LAYOUT[state];
      expect(p, state).toBeDefined();
      expect(p.x - NODE_RADIUS).toBeGreaterThan(0);
      expect(p.x + NODE_RADIUS).toBeLessThan(GUARD_GRAPH_VIEWBOX.width);
      expect(p.y - NODE_RADIUS).toBeGreaterThan(0);
      expect(p.y + NODE_RADIUS).toBeLessThan(GUARD_GRAPH_VIEWBOX.height);
    }
  });

  it("produces a path for every edge", () => {
    const edges = buildGraphEdges(GUARD_DFA);
    for (const edge of edges) {
      const reverse = edges.some((other) => other.from === edge.to && other.to === edge.from && !other.selfLoop);
      const geometry = edgeGeometry(edge, GUARD_GRAPH_LAYOUT, reverse);
      expect(geometry.path).toMatch(/^M [\d.-]+ [\d.-]+ [QC] /);
      expect(Number.isFinite(geometry.label.x) && Number.isFinite(geometry.label.y)).toBe(true);
    }
  });
});

describe("circularLayout", () => {
  it("gives every state a distinct position", () => {
    const layout = circularLayout(["a", "b", "c", "d"], 400, 400);
    const points = Object.values(layout).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    expect(new Set(points).size).toBe(4);
  });
});
