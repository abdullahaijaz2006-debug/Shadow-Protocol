import type { GuardState } from "../guard/guardDfa";
import { PALETTE } from "../palette";
import { px, type Draw } from "./draw";

const OUTLINE = PALETTE.guardOutline;

function exclamation(color: number, offset = 0): Draw {
  return (g) => {
    px(g, OUTLINE, offset + 0, 2, 4, 11);
    px(g, color, offset + 1, 3, 2, 6);
    px(g, color, offset + 1, 10, 2, 2);
  };
}

/** One icon per DFA state, drawn above the guard's head. Width in pixels and drawing. */
export const STATE_ICONS: Record<GuardState, { readonly width: number; readonly draw: Draw }> = {
  // Calm: three small dots ("…").
  PATROL: {
    width: 10,
    draw: (g) => {
      px(g, OUTLINE, 0, 9, 10, 4);
      for (const x of [1, 4, 7]) px(g, PALETTE.iconPatrol, x, 10, 2, 2);
    },
  },
  // Just noticed something: a yellow "!".
  ALERT: { width: 4, draw: exclamation(PALETTE.visionCalm) },
  // Pursuing: a red "!!".
  CHASE: {
    width: 9,
    draw: (g) => {
      exclamation(PALETTE.visionChase, 0)(g);
      exclamation(PALETTE.visionChase, 5)(g);
    },
  },
  // Investigating: an orange "?".
  SEARCH: {
    width: 8,
    draw: (g) => {
      px(g, OUTLINE, 0, 2, 8, 11);
      px(g, PALETTE.visionAlert, 2, 3, 4, 1);
      px(g, PALETTE.visionAlert, 1, 4, 2, 1);
      px(g, PALETTE.visionAlert, 5, 4, 2, 2);
      px(g, PALETTE.visionAlert, 4, 6, 2, 1);
      px(g, PALETTE.visionAlert, 3, 7, 2, 2);
      px(g, PALETTE.visionAlert, 3, 10, 2, 2);
    },
  },
  // Caught: a red "✖".
  CAPTURE: {
    width: 10,
    draw: (g) => {
      px(g, OUTLINE, 0, 2, 10, 10);
      for (let i = 0; i < 8; i++) {
        px(g, PALETTE.iconCapture, 1 + i, 3 + i);
        px(g, PALETTE.iconCapture, 8 - i, 3 + i);
      }
    },
  },
};
