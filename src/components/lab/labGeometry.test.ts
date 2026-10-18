import { describe, expect, it } from "vitest";
import { EPSILON } from "../../automata";
import { labLayout, transitionEdgeKey } from "./labGeometry";
import { emptyLab, exampleLab, LAB_CANVAS, labReducer } from "./labModel";

describe("labLayout", () => {
  it("uses each state's own position, keyed by its stable id", () => {
    const lab = exampleLab();
    const layout = labLayout(lab);
    for (const s of lab.states) expect(layout[s.id]).toMatchObject({ x: s.x, y: s.y });
  });

  it("puts self-loops on the side away from the canvas center", () => {
    let lab = emptyLab();
    lab = labReducer(lab, { type: "addState", x: LAB_CANVAS.width / 2, y: 60 }); // top (start)
    lab = labReducer(lab, { type: "addState", x: LAB_CANVAS.width / 2, y: LAB_CANVAS.height - 60 }); // bottom
    lab = labReducer(lab, { type: "addState", x: LAB_CANVAS.width - 60, y: LAB_CANVAS.height / 2 }); // right
    lab = labReducer(lab, { type: "addState", x: 60, y: LAB_CANVAS.height / 2 }); // left
    const [top, bottom, right, left] = lab.states.map((s) => labLayout(lab)[s.id].loop);
    expect([top, bottom, right, left]).toEqual(["up", "down", "right", "left"]);
  });

  it("never puts the start state's loop on the left, where the start arrow is", () => {
    let lab = labReducer(emptyLab(), { type: "addState", x: 60, y: LAB_CANVAS.height / 2 });
    expect(labLayout(lab)[lab.states[0].id].loop).not.toBe("left");
    lab = labReducer(lab, { type: "setStart", id: null });
    expect(labLayout(lab)[lab.states[0].id].loop).toBe("left");
  });
});

describe("transitionEdgeKey", () => {
  it("matches the graph's arrow keys, keeping ε-arrows separate", () => {
    expect(transitionEdgeKey({ id: "t1", from: "s1", to: "s2", symbol: "a" })).toBe("s1->s2");
    expect(transitionEdgeKey({ id: "t2", from: "s1", to: "s2", symbol: EPSILON })).toBe("s1->s2:ε");
  });
});
