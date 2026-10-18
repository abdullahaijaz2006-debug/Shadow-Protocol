import { describe, expect, it } from "vitest";
import { PLAYER_SPEED } from "../constants";
import { movementDirection, movementVelocity, type MovementInput } from "./movement";

const NONE: MovementInput = { up: false, down: false, left: false, right: false };

function held(...directions: (keyof MovementInput)[]): MovementInput {
  return { ...NONE, ...Object.fromEntries(directions.map((direction) => [direction, true])) };
}

describe("movementDirection", () => {
  it("is zero when no keys are held", () => {
    expect(movementDirection(NONE)).toEqual({ x: 0, y: 0 });
  });

  it.each([
    ["up", { x: 0, y: -1 }],
    ["down", { x: 0, y: 1 }],
    ["left", { x: -1, y: 0 }],
    ["right", { x: 1, y: 0 }],
  ] as const)("moves %s at full speed", (direction, expected) => {
    expect(movementDirection(held(direction))).toEqual(expected);
  });

  it("cancels opposite keys", () => {
    expect(movementDirection(held("left", "right"))).toEqual({ x: 0, y: 0 });
    expect(movementDirection(held("up", "down"))).toEqual({ x: 0, y: 0 });
    expect(movementDirection(held("up", "left", "right"))).toEqual({ x: 0, y: -1 });
  });

  it("points diagonally with both components equal to 1/√2", () => {
    const direction = movementDirection(held("down", "right"));
    expect(direction.x).toBeCloseTo(Math.SQRT1_2);
    expect(direction.y).toBeCloseTo(Math.SQRT1_2);
  });
});

describe("movementVelocity", () => {
  it.each([
    [["up", "left"]],
    [["up", "right"]],
    [["down", "left"]],
    [["down", "right"]],
  ] as const)("diagonal %j is no faster than straight movement", (directions) => {
    const diagonal = movementVelocity(held(...directions), PLAYER_SPEED);
    const straight = movementVelocity(held("right"), PLAYER_SPEED);
    expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(PLAYER_SPEED);
    expect(Math.hypot(straight.x, straight.y)).toBe(PLAYER_SPEED);
  });

  it("scales with the configured speed", () => {
    expect(movementVelocity(held("left"), 50)).toEqual({ x: -50, y: 0 });
  });
});
