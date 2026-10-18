// Graph layout for the Lab canvas. Pure TypeScript.
import { EPSILON } from "../../automata";
import { edgeKey, type GraphLayout, type LoopSide } from "../visualizer/graphLayout";
import { LAB_CANVAS, type LabAutomaton, type LabTransition } from "./labModel";

/**
 * Node positions keyed by state id (as drawn by labToGraphAutomaton), using the positions the user
 * dragged the states to. Each self-loop goes on the side facing away from the canvas center.
 */
export function labLayout(lab: LabAutomaton): GraphLayout {
  const cx = LAB_CANVAS.width / 2;
  const cy = LAB_CANVAS.height / 2;
  return Object.fromEntries(
    lab.states.map((s) => {
      const dx = s.x - cx;
      const dy = s.y - cy;
      let loop: LoopSide = Math.abs(dy) * 1.6 >= Math.abs(dx) ? (dy > 0 ? "down" : "up") : dx > 0 ? "right" : "left";
      // The start arrow comes in from the left, so the start state's loop goes elsewhere.
      if (loop === "left" && s.id === lab.startId) loop = dy > 0 ? "down" : "up";
      return [s.id, { x: s.x, y: s.y, loop }];
    }),
  );
}

/** The drawn arrow a transition belongs to (see AutomatonGraph / edgeKey). */
export function transitionEdgeKey(t: LabTransition): string {
  return edgeKey({ from: t.from, to: t.to, epsilon: t.symbol === EPSILON });
}
