import type { GuardSymbol } from "../../game/guard/guardDfa";
import type { GraphLayout } from "./graphLayout";

/** Hand-placed positions for the guard DFA, in this SVG view box. */
export const GUARD_GRAPH_VIEWBOX = { width: 520, height: 380 } as const;

export const GUARD_GRAPH_LAYOUT: GraphLayout = {
  PATROL: { x: 110, y: 185, loop: "up" },
  ALERT: { x: 250, y: 100, loop: "up" },
  SEARCH: { x: 250, y: 270, loop: "down" },
  CHASE: { x: 380, y: 185, loop: "down" },
  CAPTURE: { x: 475, y: 185, loop: "up" },
};

/** Short display labels so arrows stay readable; the formal definition lists the full symbols. */
export const GUARD_SYMBOL_LABELS: Readonly<Record<GuardSymbol, string>> = {
  PLAYER_SPOTTED: "spotted",
  PLAYER_LOST: "lost",
  SOUND_HEARD: "sound",
  PLAYER_CAUGHT: "caught",
  TIMER_EXPIRED: "timer",
};
