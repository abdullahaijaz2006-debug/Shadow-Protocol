/**
 * Automata engine (DFA / NFA) for guard behaviour.
 *
 * Must stay pure TypeScript — no Phaser, React or Tauri imports (enforced by boundary.test.ts) —
 * so it can be unit-tested in isolation and reused by the game, the visualizer and the automata lab.
 */
export * from "./types";
export * from "./errors";
export { assertValid, assertValidInput, validate, validateDFA, validateNFA } from "./validate";
export type { IssueCode, ValidationIssue } from "./validate";
export {
  acceptsDFA,
  compileDFA,
  CompiledDFA,
  completeWithSelfLoops,
  completeWithTrap,
  dfaStep,
  runDFA,
} from "./dfa";
export type { DfaRunResult, DfaStepRecord } from "./dfa";
export { acceptsNFA, compileNFA, CompiledNFA, epsilonClosure, nfaStep, runNFA } from "./nfa";
export type { NfaRunResult, NfaStepRecord } from "./nfa";
export { nfaToDfa, subsetName } from "./subsetConstruction";
export type { SubsetConstructionResult } from "./subsetConstruction";
export { AutomatonRunner } from "./runner";
export * as examples from "./examples";
