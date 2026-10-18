import { useId, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { EPSILON, type Automaton, type InputSymbol, type State } from "../../automata";
import { buildGraphEdges, edgeGeometry, edgeKey, NODE_RADIUS, type GraphEdge, type GraphLayout } from "./graphLayout";

/** A transition to highlight: δ(from, symbol) ∋ to (symbol may be ε). */
export interface HighlightedTransition {
  readonly from: State;
  readonly symbol: InputSymbol;
  readonly to: State;
}

export interface GraphPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Optional editing support (used by the Automata Lab). Points are in viewBox coordinates.
 * Without it the graph is purely presentational.
 */
export interface GraphInteraction {
  readonly selectedState?: State | null;
  /** edgeKey() of the selected arrow. */
  readonly selectedEdge?: string | null;
  readonly errorStates?: ReadonlySet<State>;
  /** edgeKey()s of arrows involved in a validation problem. */
  readonly errorEdges?: ReadonlySet<string>;
  /** A rubber-band line while a new transition is being drawn. */
  readonly preview?: { readonly from: State; readonly to: GraphPoint } | null;
  readonly onBackgroundPointerDown?: (point: GraphPoint, event: ReactPointerEvent<SVGSVGElement>) => void;
  readonly onNodePointerDown?: (state: State, point: GraphPoint, event: ReactPointerEvent<SVGSVGElement>) => void;
  readonly onEdgePointerDown?: (key: string, event: ReactPointerEvent<SVGSVGElement>) => void;
  readonly onPointerMove?: (point: GraphPoint, event: ReactPointerEvent<SVGSVGElement>) => void;
  /** `overState` is the state under the pointer when it was released, if any. */
  readonly onPointerUp?: (point: GraphPoint, overState: State | null, event: ReactPointerEvent<SVGSVGElement>) => void;
}

interface AutomatonGraphProps {
  /** A DFA or an NFA; drawn straight from its 5-tuple. */
  readonly automaton: Automaton;
  readonly layout: GraphLayout;
  readonly viewBox: { readonly width: number; readonly height: number };
  /** The current state (DFA) or set of active states (NFA). */
  readonly current: readonly State[];
  /** Transitions taken by the last step (one for a DFA; possibly several, incl. ε-edges, for an NFA). */
  readonly live?: readonly HighlightedTransition[];
  /** A transition selected in a history (inspection only). */
  readonly inspected?: HighlightedTransition | null;
  readonly symbolLabel?: (symbol: InputSymbol) => string;
  /** Text inside each node (defaults to the state's name). */
  readonly stateLabel?: (state: State) => string;
  /** Tooltip for each node (defaults to the state's name). */
  readonly stateTitle?: (state: State) => string;
  /** Edges to leave out of the drawing (e.g. arrows into a trap state). Live edges are always drawn. */
  readonly hideEdge?: (edge: GraphEdge) => boolean;
  /** Makes the graph editable (selection, dragging, drawing new edges). */
  readonly interaction?: GraphInteraction;
  readonly className?: string;
}

const LINE_HEIGHT = 12;
const MARKERS = ["normal", "live", "inspect", "epsilon"] as const;

/** Names longer than this are wrapped (after commas) onto several smaller lines. */
const LONG_LABEL = 9;
const WRAP_WIDTH = 12;

/** Splits a long state name such as "{PATROL,ALERT,SEARCH}" into short lines, breaking after commas. */
export function wrapLabel(text: string): string[] {
  if (text.length <= LONG_LABEL) return [text];
  const parts = text.split(/(?<=,)/);
  const lines: string[] = [];
  for (const part of parts) {
    const last = lines[lines.length - 1];
    if (last !== undefined && last.length + part.length <= WRAP_WIDTH) lines[lines.length - 1] = last + part;
    else lines.push(part);
  }
  return lines;
}

/**
 * Draws a DFA or NFA as a state graph: one arrow per (from, to) pair listing its symbols, ε-edges
 * as separate dashed arrows, a start arrow into q₀, and double circles for accepting states.
 * It only reads the definition and highlights; with `interaction` it reports pointer events,
 * but the caller decides what they change.
 */
export function AutomatonGraph({
  automaton,
  layout,
  viewBox,
  current,
  live = [],
  inspected,
  symbolLabel = (s) => s,
  stateLabel = (s) => s,
  stateTitle = (s) => s,
  hideEdge,
  interaction,
  className,
}: AutomatonGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  // Marker ids must be unique per SVG, since several graphs can be on screen at once.
  const id = useId().replace(/:/g, "");
  const edges = buildGraphEdges(automaton);
  const accepting = new Set(automaton.accepting);
  const isCurrent = new Set(current);
  const fullAlphabet = (symbols: readonly InputSymbol[]) =>
    symbols.length === automaton.alphabet.length && automaton.alphabet.length > 1;
  // There may be no (valid) start state while an automaton is being edited.
  const start = layout[automaton.start] as GraphLayout[string] | undefined;

  /** Client (screen) coordinates → viewBox coordinates. */
  const toPoint = (event: ReactPointerEvent<SVGSVGElement>): GraphPoint => {
    const matrix = svgRef.current?.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: p.x, y: p.y };
  };
  const handlers = interaction && {
    onPointerDown: (event: ReactPointerEvent<SVGSVGElement>) => {
      if (event.button !== 0) return;
      const target = event.target as Element;
      const node = target.closest("[data-state]");
      const edge = target.closest("[data-edge-key]");
      // Keep receiving moves while dragging, even outside the graph.
      svgRef.current?.setPointerCapture(event.pointerId);
      if (node) interaction.onNodePointerDown?.(node.getAttribute("data-state")!, toPoint(event), event);
      else if (edge) interaction.onEdgePointerDown?.(edge.getAttribute("data-edge-key")!, event);
      else interaction.onBackgroundPointerDown?.(toPoint(event), event);
    },
    onPointerMove: (event: ReactPointerEvent<SVGSVGElement>) => interaction.onPointerMove?.(toPoint(event), event),
    onPointerUp: (event: ReactPointerEvent<SVGSVGElement>) => {
      const over = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-state]");
      interaction.onPointerUp?.(toPoint(event), over?.getAttribute("data-state") ?? null, event);
    },
  };
  const previewFrom = interaction?.preview ? layout[interaction.preview.from] : undefined;

  return (
    <svg
      ref={svgRef}
      className={`dfa-graph${interaction ? " graph-interactive" : ""}${className ? ` ${className}` : ""}`}
      viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
      role="img"
      aria-label={`State graph of a${automaton.kind === "NFA" ? "n NFA" : " DFA"} with states ${automaton.states.join(", ")}`}
      {...handlers}
    >
      <defs>
        {MARKERS.map((kind) => (
          <marker
            key={kind}
            id={`${id}-arrow-${kind}`}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className={`arrowhead arrowhead-${kind}`} />
          </marker>
        ))}
      </defs>
      {interaction && <rect className="graph-background" x={0} y={0} width={viewBox.width} height={viewBox.height} />}

      {/* Start arrow into q₀ */}
      {start && (
        <>
          <line
            className="edge-path"
            x1={start.x - NODE_RADIUS - 34}
            y1={start.y}
            x2={start.x - NODE_RADIUS - 2}
            y2={start.y}
            markerEnd={`url(#${id}-arrow-normal)`}
          />
          <text className="start-label" x={start.x - NODE_RADIUS - 36} y={start.y - 6}>
            start
          </text>
        </>
      )}

      {edges.map((edge) => {
        const hasReverse = edges.some((other) => other.from === edge.to && other.to === edge.from && !other.selfLoop);
        const { path, label } = edgeGeometry(edge, layout, hasReverse);
        const matches = (t: HighlightedTransition) =>
          t.from === edge.from && t.to === edge.to && (t.symbol === EPSILON) === edge.epsilon;
        const liveSymbols = new Set(live.filter(matches).map((t) => t.symbol));
        const isLive = liveSymbols.size > 0;
        const isInspect = !!inspected && matches(inspected);
        if (hideEdge?.(edge) && !isLive && !isInspect) return null;
        const kind = isInspect ? "inspect" : isLive ? "live" : edge.epsilon ? "epsilon" : "normal";
        const key = edgeKey(edge);
        const classes = [
          "edge",
          isLive && "edge-live",
          isInspect && "edge-inspect",
          edge.epsilon && "edge-epsilon",
          !isLive && !isInspect && "edge-normal",
          interaction?.selectedEdge === key && "edge-selected",
          interaction?.errorEdges?.has(key) && "edge-error",
        ]
          .filter(Boolean)
          .join(" ");
        const loop = edge.selfLoop ? layout[edge.from].loop : null;
        const lines = fullAlphabet(edge.symbols) ? ["Σ"] : edge.symbols;
        // Stack multi-line labels away from the node.
        const firstDy =
          loop === "up"
            ? -(lines.length - 1) * LINE_HEIGHT
            : loop === "down"
              ? LINE_HEIGHT - 2
              : -((lines.length - 1) * LINE_HEIGHT) / 2 + 4;
        return (
          <g key={key} className={classes} data-edge={`${edge.from}->${edge.to}`} data-edge-key={key} data-symbols={edge.symbols.join(",")}>
            {/* A wide, invisible stroke makes thin arrows easy to click. */}
            {interaction && <path d={path} className="edge-hit" />}
            <path d={path} className="edge-path" markerEnd={`url(#${id}-arrow-${kind})`} />
            <text className="edge-label" x={label.x} y={label.y} textAnchor={label.anchor}>
              {lines.map((symbol, index) => {
                const symbolLive = isLive && (symbol === "Σ" || liveSymbols.has(symbol));
                const symbolInspect = isInspect && (symbol === "Σ" || symbol === inspected!.symbol);
                return (
                  <tspan
                    key={symbol}
                    x={label.x}
                    dy={index === 0 ? firstDy : LINE_HEIGHT}
                    className={symbolInspect ? "symbol-inspect" : symbolLive ? "symbol-live" : undefined}
                  >
                    {symbol === "Σ" || symbol === EPSILON ? symbol : symbolLabel(symbol)}
                  </tspan>
                );
              })}
            </text>
          </g>
        );
      })}

      {automaton.states.map((state) => {
        const { x, y } = layout[state];
        const classes = [
          "node",
          isCurrent.has(state) && "node-current",
          inspected?.to === state && "node-inspect",
          interaction?.selectedState === state && "node-selected",
          interaction?.errorStates?.has(state) && "node-error",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <g key={state} className={classes} data-state={state}>
            <title>{stateTitle(state)}</title>
            <circle cx={x} cy={y} r={NODE_RADIUS} className="node-circle" />
            {accepting.has(state) && <circle cx={x} cy={y} r={NODE_RADIUS - 4} className="node-accept-ring" />}
            {(() => {
              const lines = wrapLabel(stateLabel(state));
              if (lines.length === 1) {
                return (
                  <text x={x} y={y + 4} textAnchor="middle" className="node-label">
                    {lines[0]}
                  </text>
                );
              }
              const lineHeight = 9;
              return (
                <text x={x} y={y + 3 - ((lines.length - 1) * lineHeight) / 2} textAnchor="middle" className="node-label node-label-long">
                  {lines.map((line, index) => (
                    <tspan key={index} x={x} dy={index === 0 ? 0 : lineHeight}>
                      {line}
                    </tspan>
                  ))}
                </text>
              );
            })()}
          </g>
        );
      })}

      {interaction?.preview && previewFrom && (
        <line
          className="edge-preview"
          x1={previewFrom.x}
          y1={previewFrom.y}
          x2={interaction.preview.to.x}
          y2={interaction.preview.to.y}
          markerEnd={`url(#${id}-arrow-live)`}
        />
      )}
    </svg>
  );
}
