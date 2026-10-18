import { describe, expect, it } from "vitest";
import { EMPTY_TAPE, tapeReducer, type TapeState } from "./tapeModel";

const TAPE: TapeState = { input: ["a", "b", "a"], position: 0, playing: false };

describe("tapeReducer", () => {
  it("step reads one symbol; run reads all remaining; reset goes back to ε", () => {
    expect(tapeReducer(TAPE, { type: "step" }).position).toBe(1);
    expect(tapeReducer({ ...TAPE, position: 1, playing: true }, { type: "run" })).toEqual({ ...TAPE, position: 3, playing: false });
    expect(tapeReducer({ ...TAPE, position: 3 }, { type: "reset" })).toEqual(TAPE);
  });

  it("never reads past the end", () => {
    expect(tapeReducer({ ...TAPE, position: 3 }, { type: "step" }).position).toBe(3);
  });

  it("clear empties the tape; load replaces it from the start", () => {
    expect(tapeReducer(TAPE, { type: "clear" })).toBe(EMPTY_TAPE);
    expect(tapeReducer({ ...TAPE, position: 2 }, { type: "load", input: ["b"] })).toEqual({ input: ["b"], position: 0, playing: false });
  });
});
