import type { ValidationIssue } from "./validate";

/** Thrown when an automaton's definition is not a valid DFA/NFA. Carries every issue found. */
export class InvalidAutomatonError extends Error {
  readonly issues: readonly ValidationIssue[];

  constructor(kind: string, issues: readonly ValidationIssue[]) {
    super(`Invalid ${kind}:\n${issues.map((issue) => `  - ${issue.message}`).join("\n")}`);
    this.name = "InvalidAutomatonError";
    this.issues = issues;
  }
}

/** Thrown when an input string contains a symbol outside Σ (or a state outside Q is used). */
export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidInputError";
  }
}
