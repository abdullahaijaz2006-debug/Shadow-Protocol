import { describe, expect, it } from "vitest";
import { facingFromAngle, facingFromVelocity } from "./facing";

describe("facingFromVelocity", () => {
  it.each([
    [0, 80, "down"],
    [0, -80, "up"],
    [80, 0, "right"],
    [-80, 0, "left"],
    [56.6, 56.6, "right"], // exact diagonal: sideways
    [-56.6, -56.6, "left"],
    [20, 70, "down"], // mostly vertical
  ] as const)("(%d, %d) → %s", (vx, vy, facing) => {
    expect(facingFromVelocity(vx, vy, "up")).toBe(facing);
  });

  it("keeps the previous facing when standing still", () => {
    expect(facingFromVelocity(0, 0, "left")).toBe("left");
  });
});

describe("facingFromAngle", () => {
  it("maps the four quadrants", () => {
    expect(facingFromAngle(0)).toBe("right");
    expect(facingFromAngle(Math.PI / 2)).toBe("down");
    expect(facingFromAngle(Math.PI)).toBe("left");
    expect(facingFromAngle(-Math.PI / 2)).toBe("up");
  });
});
