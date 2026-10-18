import { describe, expect, it } from "vitest";
import type { GuardSnapshot } from "../game/bridge";
import type { GuardState } from "../game/guard/guardDfa";
import { playerStatus } from "./playerStatus";

const guard = (name: string, state: GuardState): GuardSnapshot => ({
  id: name,
  name,
  color: "#fff",
  state,
  accepting: state === "CAPTURE",
  eventCount: 0,
  history: [],
});

describe("playerStatus", () => {
  it("is HIDDEN when every guard is patrolling (or there are none)", () => {
    expect(playerStatus([guard("G1", "PATROL"), guard("G2", "PATROL")]).kind).toBe("hidden");
    expect(playerStatus([]).kind).toBe("hidden");
  });

  it("reports the most serious situation and who causes it", () => {
    expect(playerStatus([guard("G1", "SEARCH"), guard("G2", "PATROL")])).toEqual({
      kind: "searched",
      label: "UNDER SEARCH",
      detail: "G1 investigating",
    });
    expect(playerStatus([guard("G1", "SEARCH"), guard("G2", "ALERT")])).toMatchObject({ kind: "spotted", detail: "by G2" });
    expect(playerStatus([guard("G1", "CHASE"), guard("G2", "CHASE")])).toMatchObject({ kind: "chased", detail: "by G1, G2" });
    expect(playerStatus([guard("G1", "CHASE"), guard("G2", "CAPTURE")])).toMatchObject({ kind: "caught", label: "CAUGHT" });
  });
});
