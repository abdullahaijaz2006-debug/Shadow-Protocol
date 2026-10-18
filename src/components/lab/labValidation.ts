// Turns a Lab document into an engine automaton and validates it with the Milestone 2 engine,
// mapping every problem back to the states and transitions involved. Pure TypeScript.
import { EPSILON, validate, type Automaton, type IssueCode, type Transition } from "../../automata";
import { isTypableSymbol, type LabAutomaton, type StateId, type TransitionId } from "./labModel";

export interface LabIssue {
  /**
   * Engine issues, plus the Lab's own rules that the editor enforces but an imported file can
   * break: NO_START, BAD_STATE_NAME (empty or ε) and BAD_SYMBOL (cannot be typed as input).
   */
  readonly code: IssueCode | "NO_START" | "BAD_STATE_NAME" | "BAD_SYMBOL";
  readonly message: string;
  /** States to highlight for this problem. */
  readonly stateIds: readonly StateId[];
  /** Transitions to highlight for this problem. */
  readonly transitionIds: readonly TransitionId[];
}

/** Placeholder name for a transition end whose state no longer exists (e.g. in an imported file). */
export function missingStateName(id: StateId): string {
  return `⟨missing ${id}⟩`;
}

/**
 * The formal automaton (Q, Σ, δ, q₀, F) using state *names*, as the engine and the formal
 * definition expect. References to missing states become placeholder names, so the engine reports
 * them as states outside Q instead of silently dropping them.
 */
export function labToAutomaton(lab: LabAutomaton): Automaton {
  const names = new Map(lab.states.map((s) => [s.id, s.name]));
  const name = (id: StateId) => names.get(id) ?? missingStateName(id);
  return {
    kind: lab.kind,
    states: lab.states.map((s) => s.name),
    alphabet: [...lab.alphabet],
    transitions: lab.transitions.map((t): Transition => ({ from: name(t.from), symbol: t.symbol, to: name(t.to) })),
    start: lab.startId === null ? "" : name(lab.startId),
    accepting: lab.acceptingIds.map(name),
  };
}

/**
 * The same automaton keyed by stable ids instead of names, for drawing: renamed or duplicate names
 * can never confuse the graph. Transitions to missing states are left out (validation lists them).
 */
export function labToGraphAutomaton(lab: LabAutomaton): Automaton {
  const ids = new Set(lab.states.map((s) => s.id));
  return {
    kind: lab.kind,
    states: lab.states.map((s) => s.id),
    alphabet: [...lab.alphabet],
    transitions: lab.transitions
      .filter((t) => ids.has(t.from) && ids.has(t.to))
      .map((t): Transition => ({ from: t.from, symbol: t.symbol, to: t.to })),
    start: lab.startId !== null && ids.has(lab.startId) ? lab.startId : "",
    accepting: lab.acceptingIds.filter((id) => ids.has(id)),
  };
}

/** Every problem the engine finds (plus the Lab's own rules, see LabIssue), linked to the editor's elements. */
export function validateLab(lab: LabAutomaton): LabIssue[] {
  const automaton = labToAutomaton(lab);
  const idsByName = new Map<string, StateId[]>();
  for (const s of lab.states) idsByName.set(s.name, [...(idsByName.get(s.name) ?? []), s.id]);
  const names = new Map(lab.states.map((s) => [s.id, s.name]));
  const nameOf = (id: StateId) => names.get(id) ?? missingStateName(id);
  const statesNamed = (name: string | undefined) => (name === undefined ? [] : (idsByName.get(name) ?? []));
  const transitionsFrom = (name: string | undefined, symbol: string | undefined) =>
    lab.transitions.filter((t) => nameOf(t.from) === name && t.symbol === symbol).map((t) => t.id);

  const labRules: LabIssue[] = [
    ...lab.states
      .filter((s) => s.name.trim() === "" || s.name.trim() === EPSILON)
      .map((s): LabIssue => ({
        code: "BAD_STATE_NAME",
        message: s.name.trim() === "" ? "A state has an empty name." : `A state is named "${EPSILON}", which is reserved for the empty string.`,
        stateIds: [s.id],
        transitionIds: [],
      })),
    ...lab.alphabet
      .filter((symbol) => symbol !== EPSILON && !isTypableSymbol(symbol))
      .map((symbol): LabIssue => ({
        code: "BAD_SYMBOL",
        message: `Symbol "${symbol}" is empty or contains a space or comma, so it cannot be typed in an input string.`,
        stateIds: [],
        transitionIds: lab.transitions.filter((t) => t.symbol === symbol).map((t) => t.id),
      })),
  ];

  const engine = validate(automaton).map((issue): LabIssue => {
    switch (issue.code) {
      case "START_NOT_IN_STATES":
        if (lab.startId === null) {
          return { code: "NO_START", message: "No start state q₀ has been chosen.", stateIds: [], transitionIds: [] };
        }
        return { ...issue, stateIds: [], transitionIds: [] };
      case "MISSING_TRANSITION":
        return { ...issue, stateIds: statesNamed(issue.state), transitionIds: [] };
      case "DUPLICATE_TRANSITION":
      case "UNKNOWN_SYMBOL":
      case "EPSILON_IN_DFA":
        return { ...issue, stateIds: statesNamed(issue.state), transitionIds: transitionsFrom(issue.state, issue.symbol) };
      case "UNKNOWN_STATE":
        return {
          ...issue,
          stateIds: [],
          transitionIds: lab.transitions.filter((t) => nameOf(t.from) === issue.state || nameOf(t.to) === issue.state).map((t) => t.id),
        };
      case "DUPLICATE_STATE":
        return { ...issue, stateIds: statesNamed(issue.state), transitionIds: [] };
      default:
        return { ...issue, stateIds: [], transitionIds: [] };
    }
  });
  return [...labRules, ...engine];
}

/** Short, plain-language titles for the issue list. */
export const ISSUE_TITLES: Readonly<Record<LabIssue["code"], string>> = {
  NO_START: "No start state",
  BAD_STATE_NAME: "Invalid state name",
  BAD_SYMBOL: "Invalid symbol name",
  EMPTY_STATES: "No states",
  DUPLICATE_STATE: "Duplicate state name",
  DUPLICATE_SYMBOL: "Duplicate symbol",
  EPSILON_IN_ALPHABET: "ε in Σ",
  START_NOT_IN_STATES: "Invalid start state",
  ACCEPTING_NOT_IN_STATES: "Invalid accepting state",
  UNKNOWN_STATE: "Invalid state reference",
  UNKNOWN_SYMBOL: "Invalid symbol",
  EPSILON_IN_DFA: "ε-transition in a DFA",
  DUPLICATE_TRANSITION: "Not deterministic",
  MISSING_TRANSITION: "Incomplete DFA",
};

