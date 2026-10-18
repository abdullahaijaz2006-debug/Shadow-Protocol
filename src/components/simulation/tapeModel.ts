// An input tape shared by every string simulator (NFA ⇄ DFA comparison, Automata Lab). Pure TypeScript.
import type { InputSymbol } from "../../automata";

/** The whole input string, and how many of its symbols have been read so far (the prefix input[0 .. position)). */
export interface TapeState {
  readonly input: readonly InputSymbol[];
  readonly position: number;
  /** Auto-advance one symbol at a time. */
  readonly playing: boolean;
}

export type TapeAction =
  /** Add a symbol to the end of the input (it is not read until stepped to). */
  | { readonly type: "append"; readonly symbol: InputSymbol }
  /** Remove the last symbol of the input (moving back if it had already been read). */
  | { readonly type: "removeLast" }
  /** Read the next symbol. */
  | { readonly type: "step" }
  /** Read all remaining symbols at once. */
  | { readonly type: "run" }
  | { readonly type: "play" }
  | { readonly type: "pause" }
  /** Back to the start of the same input (nothing read: the empty prefix ε). */
  | { readonly type: "reset" }
  /** Empty input. */
  | { readonly type: "clear" }
  /** Replace the input and start from the beginning. */
  | { readonly type: "load"; readonly input: readonly InputSymbol[] };

export const EMPTY_TAPE: TapeState = { input: [], position: 0, playing: false };

export function tapeReducer(state: TapeState, action: TapeAction): TapeState {
  switch (action.type) {
    case "append":
      return { ...state, input: [...state.input, action.symbol] };
    case "removeLast": {
      if (state.input.length === 0) return state;
      const input = state.input.slice(0, -1);
      return { input, position: Math.min(state.position, input.length), playing: false };
    }
    case "step": {
      if (state.position >= state.input.length) return { ...state, playing: false };
      const position = state.position + 1;
      return { ...state, position, playing: state.playing && position < state.input.length };
    }
    case "run":
      return { ...state, position: state.input.length, playing: false };
    case "play":
      return state.position < state.input.length ? { ...state, playing: true } : state;
    case "pause":
      return { ...state, playing: false };
    case "reset":
      return { ...state, position: 0, playing: false };
    case "clear":
      return EMPTY_TAPE;
    case "load":
      return { input: [...action.input], position: 0, playing: false };
  }
}
