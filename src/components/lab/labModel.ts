// The Automata Lab's editable document and every editing operation. Pure TypeScript (no React),
// so it is unit-tested. Validation lives in labValidation.ts; simulation stays in the engine.
import { EPSILON } from "../../automata";

/** Stable internal identifier of a state ("s1", "s2", …). Never shown to the user, never reused. */
export type StateId = string;
/** Stable internal identifier of a transition ("t1", "t2", …). */
export type TransitionId = string;

export interface LabState {
  readonly id: StateId;
  /** What the user sees and what the formal definition uses (must be unique and non-empty). */
  readonly name: string;
  /** Position on the editor canvas (viewBox units). */
  readonly x: number;
  readonly y: number;
}

/** One edge of δ, referring to states by id, so renaming a state never breaks it. */
export interface LabTransition {
  readonly id: TransitionId;
  readonly from: StateId;
  readonly to: StateId;
  /** A symbol of Σ, or EPSILON (NFA mode only). */
  readonly symbol: string;
}

export interface LabAutomaton {
  readonly kind: "DFA" | "NFA";
  readonly name: string;
  readonly states: readonly LabState[];
  readonly alphabet: readonly string[];
  readonly transitions: readonly LabTransition[];
  readonly startId: StateId | null;
  readonly acceptingIds: readonly StateId[];
  /** Next number for a new id; only ever increases. */
  readonly nextId: number;
}

/** Size of the editor canvas (SVG viewBox). States are kept inside it. */
export const LAB_CANVAS = { width: 900, height: 560 } as const;
/** Keep state circles fully inside the canvas. */
const MARGIN = 40;

export function emptyLab(kind: "DFA" | "NFA" = "DFA", name = kind === "DFA" ? "Untitled DFA" : "Untitled NFA"): LabAutomaton {
  return { kind, name, states: [], alphabet: [], transitions: [], startId: null, acceptingIds: [], nextId: 1 };
}

// ---------- Editing actions ----------

export type LabAction =
  | { readonly type: "setName"; readonly name: string }
  | { readonly type: "setKind"; readonly kind: "DFA" | "NFA" }
  | { readonly type: "addState"; readonly x: number; readonly y: number; readonly name?: string }
  | { readonly type: "renameState"; readonly id: StateId; readonly name: string }
  | { readonly type: "moveState"; readonly id: StateId; readonly x: number; readonly y: number }
  | { readonly type: "deleteState"; readonly id: StateId }
  | { readonly type: "setStart"; readonly id: StateId | null }
  | { readonly type: "toggleAccepting"; readonly id: StateId }
  | { readonly type: "addSymbol"; readonly symbol: string }
  | { readonly type: "removeSymbol"; readonly symbol: string }
  | { readonly type: "addTransition"; readonly from: StateId; readonly to: StateId; readonly symbol: string }
  | { readonly type: "removeTransition"; readonly id: TransitionId }
  | { readonly type: "replace"; readonly lab: LabAutomaton };

/**
 * Applies one edit. An action that the matching `check…` function would refuse leaves the
 * document unchanged (the same object), so the reducer can never produce an inconsistent editor state.
 */
export function labReducer(lab: LabAutomaton, action: LabAction): LabAutomaton {
  switch (action.type) {
    case "setName":
      return action.name.trim() === "" ? lab : { ...lab, name: action.name.trim() };

    case "setKind":
      // Transitions are kept as they are: ε-edges in DFA mode are reported by validation, not deleted.
      return action.kind === lab.kind ? lab : { ...lab, kind: action.kind };

    case "addState": {
      const name = action.name?.trim() || nextStateName(lab);
      if (checkStateName(lab, name) !== null) return lab;
      const id = `s${lab.nextId}`;
      const state: LabState = { id, name, ...clampToCanvas(action.x, action.y) };
      return {
        ...lab,
        states: [...lab.states, state],
        // The first state becomes the start state, as in most textbook drawings.
        startId: lab.startId ?? id,
        nextId: lab.nextId + 1,
      };
    }

    case "renameState": {
      const name = action.name.trim();
      if (!hasState(lab, action.id) || checkStateName(lab, name, action.id) !== null) return lab;
      return { ...lab, states: lab.states.map((s) => (s.id === action.id ? { ...s, name } : s)) };
    }

    case "moveState": {
      if (!hasState(lab, action.id)) return lab;
      const position = clampToCanvas(action.x, action.y);
      return { ...lab, states: lab.states.map((s) => (s.id === action.id ? { ...s, ...position } : s)) };
    }

    case "deleteState":
      if (!hasState(lab, action.id)) return lab;
      return {
        ...lab,
        states: lab.states.filter((s) => s.id !== action.id),
        transitions: lab.transitions.filter((t) => t.from !== action.id && t.to !== action.id),
        startId: lab.startId === action.id ? null : lab.startId,
        acceptingIds: lab.acceptingIds.filter((id) => id !== action.id),
      };

    case "setStart":
      if (action.id !== null && !hasState(lab, action.id)) return lab;
      return { ...lab, startId: action.id };

    case "toggleAccepting":
      if (!hasState(lab, action.id)) return lab;
      return {
        ...lab,
        acceptingIds: lab.acceptingIds.includes(action.id)
          ? lab.acceptingIds.filter((id) => id !== action.id)
          : [...lab.acceptingIds, action.id],
      };

    case "addSymbol": {
      const symbol = action.symbol.trim();
      if (checkSymbol(lab, symbol) !== null) return lab;
      return { ...lab, alphabet: [...lab.alphabet, symbol] };
    }

    case "removeSymbol":
      // Transitions that use the symbol are kept and reported as invalid until fixed or removed.
      return lab.alphabet.includes(action.symbol) ? { ...lab, alphabet: lab.alphabet.filter((s) => s !== action.symbol) } : lab;

    case "addTransition": {
      if (checkTransition(lab, action.from, action.to, action.symbol) !== null) return lab;
      const transition: LabTransition = { id: `t${lab.nextId}`, from: action.from, to: action.to, symbol: action.symbol };
      return { ...lab, transitions: [...lab.transitions, transition], nextId: lab.nextId + 1 };
    }

    case "removeTransition":
      return lab.transitions.some((t) => t.id === action.id)
        ? { ...lab, transitions: lab.transitions.filter((t) => t.id !== action.id) }
        : lab;

    case "replace":
      return action.lab;
  }
}

// ---------- Checks (return a reason, or null if the edit is allowed) ----------

/** Why `name` cannot be used for a state (ignoring the state `exceptId` itself), or null. */
export function checkStateName(lab: LabAutomaton, name: string, exceptId?: StateId): string | null {
  const trimmed = name.trim();
  if (trimmed === "") return "A state needs a name.";
  if (trimmed === EPSILON) return `"${EPSILON}" is reserved for the empty string.`;
  if (lab.states.some((s) => s.name === trimmed && s.id !== exceptId)) return `There is already a state called "${trimmed}".`;
  return null;
}

/** A symbol the simulator's input box can express: non-empty, without spaces or commas (its separators). */
export function isTypableSymbol(symbol: string): boolean {
  return symbol !== "" && !/[\s,]/.test(symbol);
}

/** Why `symbol` cannot be added to Σ, or null. */
export function checkSymbol(lab: LabAutomaton, symbol: string): string | null {
  const trimmed = symbol.trim();
  if (trimmed === "") return "A symbol cannot be empty.";
  if (trimmed === EPSILON) return "ε is the empty string, not a symbol of Σ (use an ε-transition in NFA mode).";
  if (!isTypableSymbol(trimmed)) return "A symbol cannot contain spaces or commas (they separate symbols in an input string).";
  if (lab.alphabet.includes(trimmed)) return `"${trimmed}" is already in Σ.`;
  return null;
}

/**
 * Why this transition cannot be added, or null. Only edits that could never be meaningful are
 * refused here; a second transition for the same (state, symbol) in a DFA *is* allowed, so that
 * validation can show it as a nondeterminism problem.
 */
export function checkTransition(lab: LabAutomaton, from: StateId, to: StateId, symbol: string): string | null {
  if (!hasState(lab, from) || !hasState(lab, to)) return "Both ends of a transition must be existing states.";
  if (symbol === EPSILON) {
    if (lab.kind === "DFA") return "ε-transitions are only allowed in NFA mode.";
  } else if (!lab.alphabet.includes(symbol)) {
    return `"${symbol}" is not in Σ. Add it to the alphabet first.`;
  }
  if (lab.transitions.some((t) => t.from === from && t.to === to && t.symbol === symbol)) {
    return "That exact transition already exists.";
  }
  return null;
}

// ---------- Helpers ----------

function hasState(lab: LabAutomaton, id: StateId): boolean {
  return lab.states.some((s) => s.id === id);
}

/** The first unused name of the form q0, q1, q2, … */
export function nextStateName(lab: LabAutomaton): string {
  const used = new Set(lab.states.map((s) => s.name));
  let n = 0;
  while (used.has(`q${n}`)) n++;
  return `q${n}`;
}

export function clampToCanvas(x: number, y: number): { x: number; y: number } {
  const clamp = (value: number, max: number) => Math.round(Math.min(Math.max(value, MARGIN), max - MARGIN));
  return { x: clamp(x, LAB_CANVAS.width), y: clamp(y, LAB_CANVAS.height) };
}

export function stateById(lab: LabAutomaton, id: StateId): LabState | undefined {
  return lab.states.find((s) => s.id === id);
}

/** A small starting example: strings over {a, b} with an even number of a's. */
export function exampleLab(): LabAutomaton {
  let lab = emptyLab("DFA", "Even number of a's");
  lab = labReducer(lab, { type: "addSymbol", symbol: "a" });
  lab = labReducer(lab, { type: "addSymbol", symbol: "b" });
  lab = labReducer(lab, { type: "addState", x: 300, y: 280, name: "even" });
  lab = labReducer(lab, { type: "addState", x: 600, y: 280, name: "odd" });
  const [even, odd] = lab.states.map((s) => s.id);
  lab = labReducer(lab, { type: "toggleAccepting", id: even });
  for (const [from, symbol, to] of [
    [even, "a", odd],
    [odd, "a", even],
    [even, "b", even],
    [odd, "b", odd],
  ]) {
    lab = labReducer(lab, { type: "addTransition", from, to, symbol });
  }
  return lab;
}
