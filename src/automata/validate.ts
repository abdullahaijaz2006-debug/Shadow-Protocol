import { InvalidAutomatonError, InvalidInputError } from "./errors";
import { EPSILON, type Automaton, type DFA, type InputSymbol, type NFA, type State } from "./types";

export type IssueCode =
  | "EMPTY_STATES"
  | "DUPLICATE_STATE"
  | "DUPLICATE_SYMBOL"
  | "EPSILON_IN_ALPHABET"
  | "START_NOT_IN_STATES"
  | "ACCEPTING_NOT_IN_STATES"
  | "UNKNOWN_STATE"
  | "UNKNOWN_SYMBOL"
  | "EPSILON_IN_DFA"
  | "DUPLICATE_TRANSITION"
  | "MISSING_TRANSITION";

export interface ValidationIssue {
  readonly code: IssueCode;
  readonly message: string;
  /** The state involved, for transition-related issues. */
  readonly state?: State;
  /** The symbol involved, for transition-related issues. */
  readonly symbol?: InputSymbol;
}

/**
 * Checks that `dfa` is a valid DFA: well-formed 5-tuple, deterministic (at most one edge per
 * (q, a)) and complete (at least one edge per (q, a)). Returns every issue; empty means valid.
 */
export function validateDFA(dfa: DFA): ValidationIssue[] {
  const issues = validateStructure(dfa, false);

  // Group valid edges by (from, symbol) to check that δ is a total function.
  const targets = new Map<State, Map<InputSymbol, State[]>>();
  const states = new Set(dfa.states);
  const alphabet = new Set(dfa.alphabet);
  for (const { from, symbol, to } of dfa.transitions) {
    if (!states.has(from) || !alphabet.has(symbol)) continue;
    let bySymbol = targets.get(from);
    if (!bySymbol) targets.set(from, (bySymbol = new Map()));
    bySymbol.set(symbol, [...(bySymbol.get(symbol) ?? []), to]);
  }

  for (const state of states) {
    for (const symbol of alphabet) {
      const tos = targets.get(state)?.get(symbol) ?? [];
      if (tos.length === 0) {
        issues.push({
          code: "MISSING_TRANSITION",
          message: `δ(${state}, ${symbol}) is undefined; a DFA needs a transition for every state and symbol`,
          state,
          symbol,
        });
      } else if (tos.length > 1) {
        issues.push({
          code: "DUPLICATE_TRANSITION",
          message: `δ(${state}, ${symbol}) is defined ${tos.length} times (→ ${tos.join(", → ")}); a DFA allows exactly one`,
          state,
          symbol,
        });
      }
    }
  }
  return issues;
}

/** Checks that `nfa` is a well-formed NFA. Missing and multiple edges are allowed. */
export function validateNFA(nfa: NFA): ValidationIssue[] {
  return validateStructure(nfa, true);
}

export function validate(automaton: Automaton): ValidationIssue[] {
  return automaton.kind === "DFA" ? validateDFA(automaton) : validateNFA(automaton);
}

/** Throws InvalidAutomatonError listing every issue if `automaton` is invalid. */
export function assertValid(automaton: Automaton): void {
  const issues = validate(automaton);
  if (issues.length > 0) throw new InvalidAutomatonError(automaton.kind, issues);
}

/** Throws InvalidInputError if any symbol of the input string `input` is not in Σ. */
export function assertValidInput(automaton: Automaton, input: readonly InputSymbol[]): void {
  const alphabet = new Set(automaton.alphabet);
  input.forEach((symbol, index) => {
    if (!alphabet.has(symbol)) {
      throw new InvalidInputError(
        `Input symbol '${symbol}' at position ${index + 1} is not in Σ = {${automaton.alphabet.join(", ")}}`,
      );
    }
  });
}

/** Checks shared by DFAs and NFAs: Q non-empty, q₀ ∈ Q, F ⊆ Q, and every edge uses Q and Σ. */
function validateStructure(automaton: Automaton, allowEpsilon: boolean): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const states = new Set(automaton.states);
  const alphabet = new Set(automaton.alphabet);

  if (automaton.states.length === 0) {
    issues.push({ code: "EMPTY_STATES", message: "Q must contain at least one state" });
  }
  for (const state of findDuplicates(automaton.states)) {
    issues.push({ code: "DUPLICATE_STATE", message: `State '${state}' appears more than once in Q`, state });
  }
  for (const symbol of findDuplicates(automaton.alphabet)) {
    issues.push({ code: "DUPLICATE_SYMBOL", message: `Symbol '${symbol}' appears more than once in Σ`, symbol });
  }
  if (alphabet.has(EPSILON)) {
    issues.push({ code: "EPSILON_IN_ALPHABET", message: `ε cannot be a symbol of Σ`, symbol: EPSILON });
  }
  if (!states.has(automaton.start)) {
    issues.push({
      code: "START_NOT_IN_STATES",
      message: `Start state '${automaton.start}' is not in Q`,
      state: automaton.start,
    });
  }
  for (const state of automaton.accepting) {
    if (!states.has(state)) {
      issues.push({ code: "ACCEPTING_NOT_IN_STATES", message: `Accepting state '${state}' is not in Q`, state });
    }
  }

  for (const { from, symbol, to } of automaton.transitions) {
    const edge = `${from} --${symbol}--> ${to}`;
    for (const state of [from, to]) {
      if (!states.has(state)) {
        issues.push({ code: "UNKNOWN_STATE", message: `Edge ${edge} uses '${state}', which is not in Q`, state });
      }
    }
    if (symbol === EPSILON) {
      if (!allowEpsilon) {
        issues.push({
          code: "EPSILON_IN_DFA",
          message: `Edge ${edge} is an ε-transition; DFAs cannot have ε-transitions`,
          state: from,
          symbol,
        });
      }
    } else if (!alphabet.has(symbol)) {
      issues.push({
        code: "UNKNOWN_SYMBOL",
        message: `Edge ${edge} uses symbol '${symbol}', which is not in Σ`,
        state: from,
        symbol,
      });
    }
  }
  return issues;
}

function findDuplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}
