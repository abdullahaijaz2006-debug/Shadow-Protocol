import { describe, expect, it } from "vitest";
import { wrapLabel } from "./AutomatonGraph";

describe("wrapLabel", () => {
  it("leaves short names alone", () => {
    expect(wrapLabel("PATROL")).toEqual(["PATROL"]);
    expect(wrapLabel("{q0,q1}")).toEqual(["{q0,q1}"]);
  });

  it("wraps long subset names after commas, keeping every character", () => {
    const name = "{PATROL,ALERT,SEARCH,CHASE}";
    const lines = wrapLabel(name);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join("")).toBe(name);
    expect(lines.every((line) => line.length <= 13)).toBe(true);
  });
});
