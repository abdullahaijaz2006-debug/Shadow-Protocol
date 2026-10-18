// Multiple guards: unique identities, safe routes, and fully independent DFA runs.
import { describe, expect, it } from "vitest";
import { runDFA, validateDFA } from "../../automata";
import { angleBetween } from "../geometry";
import { LevelGrid } from "../level/grid";
import { LEVEL_01 } from "../level/levels";
import { parseLevel } from "../level/parseLevel";
import { GuardBrain } from "./GuardBrain";
import { GUARD_CONFIG, GUARDS, guardCssColor } from "./guardConfig";
import { GUARD_DFA, type GuardSymbol } from "./guardDfa";
import { canSee } from "./perception";

describe("GUARDS roster", () => {
  it("has 2–3 guards", () => {
    expect(GUARDS.length).toBeGreaterThanOrEqual(2);
    expect(GUARDS.length).toBeLessThanOrEqual(3);
  });

  it("gives every guard a unique id, name, color and uniform number", () => {
    for (const key of ["id", "name", "color", "label"] as const) {
      expect(new Set(GUARDS.map((guard) => guard[key])).size, key).toBe(GUARDS.length);
    }
  });

  it("formats colors as CSS hex", () => {
    expect(guardCssColor(0x0a0b0c)).toBe("#0a0b0c");
  });

  it("starts every guard on its own tile", () => {
    const starts = GUARDS.map((guard) => `${guard.patrolRoute[0].col},${guard.patrolRoute[0].row}`);
    expect(new Set(starts).size).toBe(GUARDS.length);
  });

  it("does not let any guard see the player at the very start", () => {
    const level = parseLevel(LEVEL_01);
    const grid = new LevelGrid(level);
    const player = grid.tileCenter(level.playerSpawn);
    const vision = { radius: GUARD_CONFIG.visionRadius, fovRadians: (GUARD_CONFIG.fovDegrees * Math.PI) / 180 };
    for (const guard of GUARDS) {
      const eye = grid.tileCenter(guard.patrolRoute[0]);
      const facing = angleBetween(eye, grid.tileCenter(guard.patrolRoute[1]));
      expect(canSee(eye, facing, player, vision, grid.isSolid), guard.id).toBe(false);
    }
  });
});

describe("independent DFA runs", () => {
  it("shares one frozen DFA definition that no run can modify", () => {
    expect(Object.isFrozen(GUARD_DFA)).toBe(true);
    expect(Object.isFrozen(GUARD_DFA.transitions)).toBe(true);
    expect(Object.isFrozen(GUARD_DFA.transitions[0])).toBe(true);
    expect(() => {
      (GUARD_DFA.transitions as unknown as unknown[]).push({});
    }).toThrow();
    expect(validateDFA(GUARD_DFA)).toEqual([]);
  });

  it("keeps separate state and history for each guard", () => {
    const [a, b, c] = [new GuardBrain(), new GuardBrain(), new GuardBrain()];
    a.process("PLAYER_SPOTTED");
    a.process("TIMER_EXPIRED"); // a: CHASE
    b.process("SOUND_HEARD"); // b: SEARCH
    expect([a.state, b.state, c.state]).toEqual(["CHASE", "SEARCH", "PATROL"]);
    expect(a.history.map((r) => r.symbol)).toEqual(["PLAYER_SPOTTED", "TIMER_EXPIRED"]);
    expect(b.history.map((r) => r.symbol)).toEqual(["SOUND_HEARD"]);
    expect(c.history).toEqual([]);
  });

  it("numbers each guard's events from 1 independently", () => {
    const [a, b] = [new GuardBrain(), new GuardBrain()];
    a.process("PLAYER_LOST");
    a.process("PLAYER_LOST");
    b.process("PLAYER_LOST");
    expect(a.history.map((r) => r.step)).toEqual([1, 2]);
    expect(b.history.map((r) => r.step)).toEqual([1]);
  });

  it("interleaving events across guards gives each the same result as running it alone", () => {
    const inputs: GuardSymbol[][] = [
      ["PLAYER_SPOTTED", "TIMER_EXPIRED", "PLAYER_LOST", "TIMER_EXPIRED"],
      ["SOUND_HEARD", "SOUND_HEARD", "PLAYER_SPOTTED", "PLAYER_CAUGHT"],
      ["TIMER_EXPIRED", "PLAYER_SPOTTED"],
    ];
    const brains = inputs.map(() => new GuardBrain());
    // Round-robin, like the scene ticking every guard in turn.
    for (let i = 0; i < 4; i++) inputs.forEach((input, g) => input[i] && brains[g].process(input[i]));
    inputs.forEach((input, g) => expect(brains[g].state).toBe(runDFA(GUARD_DFA, input).finalState));
  });
});
